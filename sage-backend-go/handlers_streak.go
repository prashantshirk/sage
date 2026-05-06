package main

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
)

func RegisterStreakRoutes(r *gin.Engine) {
	streak := r.Group("/api/streak")
	streak.Use(requireAuth)
	{
		streak.GET("/", getStreakInfo)
		streak.POST("/submit", submitStreak)
	}
}

func getStreakInfo(c *gin.Context) {
	userID := c.GetString("user_id")

	var streak Streak
	err := DB.Collection("streaks").FindOne(context.Background(), bson.M{"user_id": userID}).Decode(&streak)

	if err != nil {
		// Return empty mock if not found
		c.JSON(http.StatusOK, gin.H{
			"user_id":        userID,
			"current_streak": 0,
			"best_streak":    0,
			"history":        []StreakHistory{},
		})
		return
	}

	c.JSON(http.StatusOK, streak)
}

func submitStreak(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"success": true})
}
