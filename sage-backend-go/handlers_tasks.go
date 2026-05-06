package main

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func RegisterTasksRoutes(r *gin.Engine) {
	tasks := r.Group("/api/tasks")
	tasks.Use(requireAuth)
	{
		tasks.GET("/today", getTasksToday)
		tasks.GET("/upcoming", getTasksUpcoming)
		tasks.POST("/", createTask)
		tasks.PATCH("/:id/status", updateTaskStatus)
		tasks.DELETE("/:id", deleteTask)
		tasks.POST("/sync-calendar", syncCalendarTasks)
	}
}

func getTasksToday(c *gin.Context) {
	userID := c.GetString("user_id")

	// Mark overdue tasks
	now := time.Now().UTC()
	DB.Collection("tasks").UpdateMany(
		context.Background(),
		bson.M{
			"user_id":  userID,
			"status":   "pending",
			"due_date": bson.M{"$lt": now},
		},
		bson.M{"$set": bson.M{"status": "overdue"}},
	)

	startOfToday := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	endOfToday := startOfToday.Add(24 * time.Hour)

	cursor, err := DB.Collection("tasks").Find(context.Background(), bson.M{
		"user_id":  userID,
		"due_date": bson.M{"$gte": startOfToday, "$lt": endOfToday},
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var tasks []Task
	if err = cursor.All(context.Background(), &tasks); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if tasks == nil {
		tasks = []Task{}
	}

	c.JSON(http.StatusOK, tasks)
}

func getTasksUpcoming(c *gin.Context) {
	userID := c.GetString("user_id")

	now := time.Now().UTC()
	future := now.Add(7 * 24 * time.Hour)

	cursor, err := DB.Collection("tasks").Find(context.Background(), bson.M{
		"user_id":  userID,
		"due_date": bson.M{"$gte": now, "$lte": future},
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var tasks []Task
	if err = cursor.All(context.Background(), &tasks); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	grouped := map[string][]Task{
		"tomorrow":  {},
		"this_week": {},
		"next_week": {},
	}

	todayDate := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)

	for _, task := range tasks {
		if task.DueDate == nil {
			continue
		}

		taskDate := time.Date(task.DueDate.Year(), task.DueDate.Month(), task.DueDate.Day(), 0, 0, 0, 0, time.UTC)
		diff := int(taskDate.Sub(todayDate).Hours() / 24)

		if diff == 1 {
			grouped["tomorrow"] = append(grouped["tomorrow"], task)
		} else if diff >= 2 && diff <= 7 {
			grouped["this_week"] = append(grouped["this_week"], task)
		} else if diff > 7 {
			grouped["next_week"] = append(grouped["next_week"], task)
		}
	}

	c.JSON(http.StatusOK, grouped)
}

func createTask(c *gin.Context) {
	userID := c.GetString("user_id")

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	task := Task{
		ID:        primitive.NewObjectID(),
		UserID:    userID,
		Status:    "pending",
		Source:    "manual",
		CreatedAt: time.Now().UTC(),
	}

	if t, ok := req["title"].(string); ok {
		task.Title = t
	}
	if n, ok := req["note"].(string); ok {
		task.Note = n
	}
	if d, ok := req["due_date"].(string); ok && d != "" {
		if parsed, err := time.Parse(time.RFC3339, d); err == nil {
			task.DueDate = &parsed
		} else if parsed, err := time.Parse("2006-01-02", d); err == nil {
			task.DueDate = &parsed
		}
	}
	if dt, ok := req["due_time"].(string); ok {
		task.DueTime = dt
	}
	if cat, ok := req["category"].(string); ok {
		task.Category = cat
	}
	if status, ok := req["status"].(string); ok {
		task.Status = status
	}
	if source, ok := req["source"].(string); ok {
		task.Source = source
	}
	if geid, ok := req["google_event_id"].(string); ok {
		task.GoogleEventID = geid
	}

	_, err := DB.Collection("tasks").InsertOne(context.Background(), task)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create task"})
		return
	}

	c.JSON(http.StatusCreated, task)
}

func updateTaskStatus(c *gin.Context) {
	taskID := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(taskID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	var req struct {
		Status string `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	update := bson.M{"status": req.Status}
	if req.Status == "completed" {
		update["completed_at"] = time.Now().UTC()
	}

	res, err := DB.Collection("tasks").UpdateOne(
		context.Background(),
		bson.M{"_id": objID},
		bson.M{"$set": update},
	)

	if err != nil || res.ModifiedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"success": false})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func deleteTask(c *gin.Context) {
	taskID := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(taskID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	res, err := DB.Collection("tasks").DeleteOne(context.Background(), bson.M{"_id": objID})
	if err != nil || res.DeletedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"success": false})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func syncCalendarTasks(c *gin.Context) {
	userID := c.GetString("user_id")

	token, err := RefreshGoogleTokenIfNeeded(userID)
	if err != nil || token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No Google connection"})
		return
	}

	events, err := FetchTodaysEvents(token, "Asia/Kolkata")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Just a simple sync
	synced := 0
	for _, event := range events {
		// Basic deduplication check
		count, _ := DB.Collection("tasks").CountDocuments(context.Background(), bson.M{
			"user_id":         userID,
			"google_event_id": event.GoogleEventID,
		})

		if count > 0 {
			continue
		}

		due, _ := time.Parse(time.RFC3339, event.StartTime)

		task := Task{
			ID:            primitive.NewObjectID(),
			UserID:        userID,
			Title:         event.Title,
			DueDate:       &due,
			Category:      "calendar",
			Source:        "google_calendar",
			GoogleEventID: event.GoogleEventID,
			Status:        "pending",
			CreatedAt:     time.Now().UTC(),
		}

		DB.Collection("tasks").InsertOne(context.Background(), task)
		synced++
	}

	c.JSON(http.StatusOK, gin.H{"synced": synced})
}
