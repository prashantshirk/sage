package main

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/x/mongo/driver/connstring"
)

var DB *mongo.Database
var MongoClient *mongo.Client

// InitMongoDB initializes the global MongoDB connection.
func InitMongoDB() {
	mongoURI := GetEnv("MONGO_URI", "")
	if mongoURI == "" {
		log.Println("MONGO_URI is not set, running without DB")
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	clientOptions := options.Client().ApplyURI(mongoURI)
	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		log.Fatalf("Failed to connect to MongoDB: %v", err)
	}

	err = client.Ping(ctx, nil)
	if err != nil {
		log.Fatalf("Failed to ping MongoDB: %v", err)
	}

	MongoClient = client

	// Parse URI to get the database name, default to "sage"
	cs, err := connstring.ParseAndValidate(mongoURI)
	dbName := "sage"
	if err == nil && cs.Database != "" {
		dbName = cs.Database
	}

	DB = client.Database(dbName)
	log.Printf("Successfully connected to MongoDB database: %s", dbName)
}
