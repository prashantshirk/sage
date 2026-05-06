package main

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func RegisterFinanceRoutes(r *gin.Engine) {
	finance := r.Group("/api/finance")
	finance.Use(requireAuth)
	{
		finance.GET("/", getExpenses)
		finance.POST("/", createExpense)
		finance.PATCH("/:id/pay", payExpense)
		finance.PATCH("/:id", updateExpense)
		finance.DELETE("/:id", deleteExpense)
		finance.GET("/summary", getFinanceSummary)
	}
}

func autoUpdateExpenseStatuses(userID string) {
	now := time.Now().UTC()
	sevenDaysLater := now.Add(7 * 24 * time.Hour)

	// Update to overdue
	DB.Collection("expenses").UpdateMany(
		context.Background(),
		bson.M{
			"user_id":  userID,
			"status":   bson.M{"$ne": "paid"},
			"due_date": bson.M{"$lt": now},
		},
		bson.M{"$set": bson.M{"status": "overdue"}},
	)

	// Update to due_soon
	DB.Collection("expenses").UpdateMany(
		context.Background(),
		bson.M{
			"user_id":  userID,
			"status":   "upcoming",
			"due_date": bson.M{"$gte": now, "$lte": sevenDaysLater},
		},
		bson.M{"$set": bson.M{"status": "due_soon"}},
	)
}

func getExpenses(c *gin.Context) {
	userID := c.GetString("user_id")
	category := c.Query("category")

	autoUpdateExpenseStatuses(userID)

	filter := bson.M{"user_id": userID}
	if category != "" {
		filter["category"] = category
	}

	cursor, err := DB.Collection("expenses").Find(context.Background(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var expenses []Expense
	if err = cursor.All(context.Background(), &expenses); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if expenses == nil {
		expenses = []Expense{}
	}

	monthlyTotal := getMonthlyTotal(userID)

	overdueCount := 0
	dueSoonCount := 0
	for _, e := range expenses {
		if e.Status == "overdue" {
			overdueCount++
		} else if e.Status == "due_soon" {
			dueSoonCount++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"expenses":       expenses,
		"monthly_total":  monthlyTotal,
		"overdue_count":  overdueCount,
		"due_soon_count": dueSoonCount,
	})
}

func getMonthlyTotal(userID string) float64 {
	now := time.Now().UTC()
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	endOfMonth := startOfMonth.AddDate(0, 1, 0)

	pipeline := []bson.M{
		{
			"$match": bson.M{
				"user_id":  userID,
				"status":   bson.M{"$ne": "paid"},
				"due_date": bson.M{"$gte": startOfMonth, "$lt": endOfMonth},
			},
		},
		{
			"$group": bson.M{
				"_id":   nil,
				"total": bson.M{"$sum": "$amount"},
			},
		},
	}

	cursor, err := DB.Collection("expenses").Aggregate(context.Background(), pipeline)
	if err != nil {
		return 0.0
	}

	var results []bson.M
	if err = cursor.All(context.Background(), &results); err != nil || len(results) == 0 {
		return 0.0
	}

	if total, ok := results[0]["total"].(float64); ok {
		return total
	}
	return 0.0
}

func createExpense(c *gin.Context) {
	userID := c.GetString("user_id")

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	expense := Expense{
		ID:        primitive.NewObjectID(),
		UserID:    userID,
		Status:    "upcoming",
		Currency:  "INR",
		CreatedAt: time.Now().UTC(),
	}

	if n, ok := req["name"].(string); ok {
		expense.Name = n
	}
	if a, ok := req["amount"].(float64); ok {
		expense.Amount = a
	}
	if d, ok := req["due_date"].(string); ok && d != "" {
		if parsed, err := time.Parse(time.RFC3339, d); err == nil {
			expense.DueDate = &parsed
		} else if parsed, err := time.Parse("2006-01-02", d); err == nil {
			expense.DueDate = &parsed
		}
	}
	if cat, ok := req["category"].(string); ok {
		expense.Category = cat
	}
	if status, ok := req["status"].(string); ok {
		expense.Status = status
	}
	if rec, ok := req["recurring"].(bool); ok {
		expense.Recurring = rec
	}
	if ri, ok := req["recurrence_interval"].(string); ok {
		expense.RecurrenceInterval = ri
	}
	if notes, ok := req["notes"].(string); ok {
		expense.Notes = notes
	}

	_, err := DB.Collection("expenses").InsertOne(context.Background(), expense)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create expense"})
		return
	}

	c.JSON(http.StatusCreated, expense)
}

func payExpense(c *gin.Context) {
	expenseID := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(expenseID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid expense ID"})
		return
	}

	res, err := DB.Collection("expenses").UpdateOne(
		context.Background(),
		bson.M{"_id": objID},
		bson.M{"$set": bson.M{
			"status":  "paid",
			"paid_at": time.Now().UTC(),
		}},
	)

	if err != nil || res.ModifiedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"success": false})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func updateExpense(c *gin.Context) {
	expenseID := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(expenseID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid expense ID"})
		return
	}

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	update := bson.M{}
	for k, v := range req {
		if k == "due_date" {
			if ds, ok := v.(string); ok && ds != "" {
				if parsed, err := time.Parse(time.RFC3339, ds); err == nil {
					update[k] = parsed
				} else if parsed, err := time.Parse("2006-01-02", ds); err == nil {
					update[k] = parsed
				}
			}
		} else {
			update[k] = v
		}
	}

	res, err := DB.Collection("expenses").UpdateOne(
		context.Background(),
		bson.M{"_id": objID},
		bson.M{"$set": update},
	)

	if err != nil || res.ModifiedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Expense not found"})
		return
	}

	var updated Expense
	DB.Collection("expenses").FindOne(context.Background(), bson.M{"_id": objID}).Decode(&updated)
	c.JSON(http.StatusOK, updated)
}

func deleteExpense(c *gin.Context) {
	expenseID := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(expenseID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid expense ID"})
		return
	}

	res, err := DB.Collection("expenses").DeleteOne(context.Background(), bson.M{"_id": objID})
	if err != nil || res.DeletedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"success": false})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func getFinanceSummary(c *gin.Context) {
	userID := c.GetString("user_id")

	autoUpdateExpenseStatuses(userID)

	cursor, err := DB.Collection("expenses").Find(context.Background(), bson.M{"user_id": userID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var expenses []Expense
	cursor.All(context.Background(), &expenses)

	now := time.Now().UTC()
	monthlyTotal := getMonthlyTotal(userID)

	overdueCount := 0
	dueThisWeekCount := 0
	dueThisWeekAmount := 0.0
	byCategory := make(map[string]float64)

	for _, e := range expenses {
		cat := e.Category
		if cat == "" {
			cat = "other"
		}
		byCategory[cat] += e.Amount

		if e.Status == "overdue" {
			overdueCount++
		}

		if e.DueDate != nil && e.Status != "paid" {
			diff := int(e.DueDate.Sub(now).Hours() / 24)
			if diff >= 0 && diff <= 7 {
				dueThisWeekCount++
				dueThisWeekAmount += e.Amount
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"monthly_total": monthlyTotal,
		"due_this_week": gin.H{
			"count":  dueThisWeekCount,
			"amount": dueThisWeekAmount,
		},
		"overdue_count": overdueCount,
		"by_category":   byCategory,
	})
}
