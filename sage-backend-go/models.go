package main

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// User represents the users collection in MongoDB
type User struct {
	ID                 primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Email              string             `bson:"email" json:"email"`
	Name               string             `bson:"name" json:"name"`
	Avatar             string             `bson:"avatar" json:"avatar"`
	GoogleAccessToken  string             `bson:"google_access_token,omitempty" json:"-"`
	GoogleRefreshToken string             `bson:"google_refresh_token,omitempty" json:"-"`
	GoogleTokenExpiry  *time.Time         `bson:"google_token_expiry,omitempty" json:"-"`
	Timezone           string             `bson:"timezone" json:"timezone"`
	Currency           string             `bson:"currency" json:"currency"`
	BriefingTime       string             `bson:"briefing_time" json:"briefing_time"`
	Notifications      map[string]bool    `bson:"notifications" json:"notifications"`
	TelegramChatID     string             `bson:"telegram_chat_id,omitempty" json:"telegram_chat_id,omitempty"`
	CreatedAt          time.Time          `bson:"created_at" json:"created_at"`
	UpdatedAt          time.Time          `bson:"updated_at" json:"updated_at"`
}

// Task represents the tasks collection
type Task struct {
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID        string             `bson:"user_id" json:"user_id"`
	Title         string             `bson:"title" json:"title"`
	Note          string             `bson:"note,omitempty" json:"note,omitempty"`
	DueDate       *time.Time         `bson:"due_date,omitempty" json:"due_date,omitempty"`
	DueTime       string             `bson:"due_time,omitempty" json:"due_time,omitempty"`
	Category      string             `bson:"category" json:"category"` // "calendar" | "reminder" | "bill"
	Status        string             `bson:"status" json:"status"`     // "pending" | "completed" | "overdue"
	Source        string             `bson:"source" json:"source"`     // "nlp" | "manual" | "google_calendar"
	GoogleEventID string             `bson:"google_event_id,omitempty" json:"google_event_id,omitempty"`
	CreatedAt     time.Time          `bson:"created_at" json:"created_at"`
	CompletedAt   *time.Time         `bson:"completed_at,omitempty" json:"completed_at,omitempty"`
}

// Expense represents the expenses collection
type Expense struct {
	ID                 primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID             string             `bson:"user_id" json:"user_id"`
	Name               string             `bson:"name" json:"name"`
	Amount             float64            `bson:"amount" json:"amount"`
	Currency           string             `bson:"currency" json:"currency"`
	DueDate            *time.Time         `bson:"due_date,omitempty" json:"due_date,omitempty"`
	Category           string             `bson:"category" json:"category"` // "subscription" | "bill" | "emi" | "utility" | "other"
	Status             string             `bson:"status" json:"status"`     // "upcoming" | "due_soon" | "overdue" | "paid"
	Recurring          bool               `bson:"recurring" json:"recurring"`
	RecurrenceInterval string             `bson:"recurrence_interval,omitempty" json:"recurrence_interval,omitempty"`
	Notes              string             `bson:"notes,omitempty" json:"notes,omitempty"`
	CreatedAt          time.Time          `bson:"created_at" json:"created_at"`
	PaidAt             *time.Time         `bson:"paid_at,omitempty" json:"paid_at,omitempty"`
}

// StreakHistory represents a single day's history in the streak
type StreakHistory struct {
	Date           string `bson:"date" json:"date"`
	TasksTotal     int    `bson:"tasks_total" json:"tasks_total"`
	TasksCompleted int    `bson:"tasks_completed" json:"tasks_completed"`
	Submitted      bool   `bson:"submitted" json:"submitted"`
}

// Streak represents the streaks collection
type Streak struct {
	ID                primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID            string             `bson:"user_id" json:"user_id"`
	CurrentStreak     int                `bson:"current_streak" json:"current_streak"`
	BestStreak        int                `bson:"best_streak" json:"best_streak"`
	LastSubmittedDate string             `bson:"last_submitted_date,omitempty" json:"last_submitted_date,omitempty"`
	History           []StreakHistory    `bson:"history" json:"history"`
}
