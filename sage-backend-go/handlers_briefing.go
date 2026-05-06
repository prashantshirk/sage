package main

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func RegisterBriefingRoutes(r *gin.Engine) {
	briefing := r.Group("/api/briefing")
	briefing.Use(requireAuth)
	{
		briefing.GET("/generate", generateBriefing)
	}
}

func generateBriefing(c *gin.Context) {
	userID := c.GetString("user_id")
	objID, _ := primitive.ObjectIDFromHex(userID)

	var user User
	DB.Collection("users").FindOne(context.Background(), bson.M{"_id": objID}).Decode(&user)

	name := user.Name
	if name == "" {
		name = "Sage User"
	}

	// In a real port, we'd query DB for counts
	// For now, passing mock string summaries to test integration
	tasksToday := "3 tasks pending"
	upcomingExpenses := "1 bill due soon"
	emailSummaries := "No urgent emails"
	calendarEvents := "No events today"

	briefingText, err := GenerateDailyBriefing(name, tasksToday, upcomingExpenses, emailSummaries, calendarEvents)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate briefing"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"briefing": briefingText,
		"summary": gin.H{
			"tasks_count":        3,
			"bills_count":        1,
			"bills_total":        500,
			"action_items_count": 0,
		},
	})
}
