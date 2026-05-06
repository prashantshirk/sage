package main

import (
	"log"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// Load environment variables
	LoadConfig()

	// Initialize MongoDB connection
	InitMongoDB()

	// Setup Gin router
	r := gin.Default()

	// Configure CORS
	frontendURL := GetEnv("FRONTEND_URL", "http://localhost:3000")
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{frontendURL}
	config.AllowCredentials = true
	config.AllowHeaders = []string{"Content-Type", "Authorization"}
	r.Use(cors.New(config))

	// Health Check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "app": "Sage Backend (Go)"})
	})

	// Setup Routes
	setupRoutes(r)

	// Start server
	port := GetEnv("PORT", "5000")
	log.Printf("Sage Go Backend running on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

// setupRoutes registers all API routes
func setupRoutes(r *gin.Engine) {
	RegisterAuthRoutes(r)
	RegisterTasksRoutes(r)
	RegisterFinanceRoutes(r)
	RegisterNLPRoutes(r)
	RegisterBriefingRoutes(r)
	RegisterStreakRoutes(r)
	RegisterSearchRoutes(r)
	RegisterTelegramRoutes(r)
}
