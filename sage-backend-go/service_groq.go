package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"
)

var (
	lastGroqCallTime time.Time
	groqMutex        sync.Mutex
)

const minCallInterval = 5 * time.Second

func rateLimitWait() {
	groqMutex.Lock()
	defer groqMutex.Unlock()

	elapsed := time.Since(lastGroqCallTime)
	if elapsed < minCallInterval {
		time.Sleep(minCallInterval - elapsed)
	}
	lastGroqCallTime = time.Now()
}

type groqMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type groqRequest struct {
	Model       string        `json:"model"`
	Messages    []groqMessage `json:"messages"`
	Temperature float64       `json:"temperature"`
	MaxTokens   int           `json:"max_tokens"`
}

func CallGroq(messages []groqMessage, systemPrompt string, maxTokens int, temperature float64, purpose string) (string, error) {
	apiKey := GetEnv("GROQ_API_KEY", "")
	if apiKey == "" {
		return "", fmt.Errorf("GROQ_API_KEY not set")
	}

	if maxTokens > 1024 {
		maxTokens = 1024
	}

	rateLimitWait()

	model := GetEnv("GROQ_MODEL", "llama3-8b-8192")
	log.Printf("Groq call | Model: %s | Purpose: %s", model, purpose)

	allMessages := append([]groqMessage{{Role: "system", Content: systemPrompt}}, messages...)

	reqBody := groqRequest{
		Model:       model,
		Messages:    allMessages,
		Temperature: temperature,
		MaxTokens:   maxTokens,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	req, _ := http.NewRequest("POST", "https://api.groq.com/openai/v1/chat/completions", bytes.NewBuffer(jsonData))
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("groq API error: %s", string(bodyBytes))
	}

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)

	choices := result["choices"].([]interface{})
	if len(choices) > 0 {
		choice := choices[0].(map[string]interface{})
		message := choice["message"].(map[string]interface{})
		return message["content"].(string), nil
	}

	return "", fmt.Errorf("no content returned")
}

func ExtractStructuredData(userInput string) (map[string]interface{}, error) {
	today := time.Now().UTC().Format("January 02, 2006")
	systemPrompt := fmt.Sprintf(`You are a personal assistant AI. The user will give you a natural language input.
Extract structured data and return ONLY valid JSON with no explanation.
Identify what type of action the user wants: 'add_task', 'add_expense', 'add_reminder', 'query', 'reschedule', or 'other'.

For add_task return: { "action": "add_task", "title": "", "due_date": "", "due_time": "", "note": "", "category": "calendar|reminder" }
For add_expense return: { "action": "add_expense", "name": "", "amount": 0, "due_date": "", "category": "subscription|bill|emi|utility", "recurring": false, "recurrence_interval": "monthly|yearly|null", "notes": "" }
For add_reminder return: { "action": "add_reminder", "title": "", "due_date": "", "note": "" }
For query return: { "action": "query", "query_type": "expenses|tasks|all" }
For reschedule return: { "action": "reschedule", "target_name": "", "new_date": "", "new_time": "" }

Today's date is %s. Parse relative dates like 'tomorrow', 'next Tuesday', 'in 2 months'.
Return only the JSON object, nothing else.`, today)

	messages := []groqMessage{{Role: "user", Content: userInput}}
	respText, err := CallGroq(messages, systemPrompt, 300, 0.1, "NLP Input Parsing")
	if err != nil {
		return nil, err
	}

	return cleanAndParseJSON(respText) // uses func from service_gemini.go
}

func GenerateDailyBriefing(userName, tasksToday, upcomingExpenses, emailSummaries, calendarEvents string) (string, error) {
	today := time.Now().UTC().Format("January 02, 2006")

	hour := time.Now().Hour()
	timeGreeting := "morning"
	if hour >= 12 && hour < 17 {
		timeGreeting = "afternoon"
	} else if hour >= 17 {
		timeGreeting = "evening"
	}

	systemPrompt := fmt.Sprintf(`You are Sage, a personal chief of staff AI. Write a warm %s briefing for %s.
Guidelines:
- Start with a warm "%s, %s!"
- Summarize the most important things needing attention today.
- Mention any urgent bills or deadlines.
- End with a motivating or insightful note.
- Keep it human, conversational, and actionable.
- Use 2-3 short paragraphs. Do not use bullet points.`, timeGreeting, userName, strings.Title(timeGreeting), userName)

	userMessage := fmt.Sprintf(`Today's date: %s
Tasks today: %s
Upcoming bills/expenses (next 7 days): %s
Recent emails needing attention: %s
Calendar events today: %s`, today, tasksToday, upcomingExpenses, emailSummaries, calendarEvents)

	messages := []groqMessage{{Role: "user", Content: userMessage}}
	return CallGroq(messages, systemPrompt, 800, 0.5, "Daily Briefing Generation")
}

func GenerateResponseMessage(action string, extractedData map[string]interface{}, success bool) string {
	if !success {
		return "Oops! I ran into an issue trying to process that. 😅"
	}

	switch action {
	case "add_task":
		title := "Task"
		if t, ok := extractedData["title"].(string); ok {
			title = t
		}
		return fmt.Sprintf("Done! I've added '%s' to your tasks. 🗓️", title)
	case "add_expense":
		name := "Expense"
		if n, ok := extractedData["name"].(string); ok {
			name = n
		}
		var amount float64
		if a, ok := extractedData["amount"].(float64); ok {
			amount = a
		}
		return fmt.Sprintf("Got it! I've added %s (₹%.2f) to your Finance Tracker. 💸", name, amount)
	case "add_reminder":
		title := "Reminder"
		if t, ok := extractedData["title"].(string); ok {
			title = t
		}
		return fmt.Sprintf("All set! I will remind you about '%s'. ⏰", title)
	case "query":
		return "Here is the information you requested. 📊"
	case "reschedule":
		target := "your event"
		if t, ok := extractedData["target_name"].(string); ok {
			target = t
		}
		date := "the new date"
		if d, ok := extractedData["new_date"].(string); ok {
			date = d
		}
		return fmt.Sprintf("Done! I've rescheduled '%s' to %s. 📅", target, date)
	}

	return "I've processed your request. 👍"
}
