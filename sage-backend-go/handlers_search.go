package main

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func RegisterSearchRoutes(r *gin.Engine) {
	search := r.Group("/api/search")
	search.Use(requireAuth)
	{
		search.GET("/", performSearch)
	}
}

func performSearch(c *gin.Context) {
	query := c.Query("q")
	// Mock search response
	c.JSON(http.StatusOK, gin.H{
		"tasks":    []Task{},
		"expenses": []Expense{},
		"query":    query,
	})
}
