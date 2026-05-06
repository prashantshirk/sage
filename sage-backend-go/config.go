package main

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

// LoadConfig loads environment variables from a .env file.
func LoadConfig() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found or error loading it. Using system environment variables.")
	}
}

// GetEnv retrieves an environment variable or returns a fallback value.
func GetEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
