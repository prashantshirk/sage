package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func RegisterTelegramRoutes(r *gin.Engine) {
	// Not protected by requireAuth, because Telegram hits this directly
	r.POST("/telegram-webhook", handleTelegramWebhook)
}

func handleTelegramWebhook(c *gin.Context) {
	var update map[string]interface{}
	if err := c.ShouldBindJSON(&update); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON"})
		return
	}

	// Ack to telegram to prevent retries
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}
