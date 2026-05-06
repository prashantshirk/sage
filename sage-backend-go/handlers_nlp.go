package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func RegisterNLPRoutes(r *gin.Engine) {
	nlp := r.Group("/api/nlp")
	nlp.Use(requireAuth)
	{
		nlp.POST("/process", processNLP)
	}
}

func processNLP(c *gin.Context) {

	var req struct {
		Text  string `json:"text"`
		Audio string `json:"audio"` // base64
		Image string `json:"image"` // base64
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	var extractedData map[string]interface{}
	var err error

	if req.Image != "" {
		extractedData, err = ExtractDataFromImage(req.Image, req.Text, "image/jpeg") // Assuming JPEG for now
	} else if req.Audio != "" {
		extractedData, err = ExtractDataFromAudio(req.Audio, req.Text, "audio/webm")
	} else if req.Text != "" {
		extractedData, err = ExtractStructuredData(req.Text)
	} else {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No input provided"})
		return
	}

	if err != nil || extractedData == nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "Sorry, I couldn't understand that.",
		})
		return
	}

	action, _ := extractedData["action"].(string)
	success := false

	// Basic execution logic
	if action == "add_task" {
		// Mock logic for executing the parsed action (creating a task)
		success = true
	} else if action == "add_expense" {
		// Mock logic for executing the parsed action (creating an expense)
		success = true
	}

	message := GenerateResponseMessage(action, extractedData, success)

	c.JSON(http.StatusOK, gin.H{
		"success": success,
		"message": message,
		"data":    extractedData,
	})
}
