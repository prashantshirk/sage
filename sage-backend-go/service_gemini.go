package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
)

const (
	PrimaryModel        = "gemini-3.1-flash-lite-preview"
	FallbackModel       = "gemini-2.5-flash-lite"
	PrimaryTimeout      = 70 * time.Second
	FallbackTimeout     = 90 * time.Second
	FallbackWaitSeconds = 2 * time.Second
)

func generateWithFallback(ctx context.Context, client *genai.Client, parts []genai.Part, purpose string) (string, error) {
	primaryCtx, cancelPrimary := context.WithTimeout(ctx, PrimaryTimeout)
	defer cancelPrimary()

	model := client.GenerativeModel(PrimaryModel)
	log.Printf("Pinging Model: %s | Purpose: %s", PrimaryModel, purpose)

	resp, err := model.GenerateContent(primaryCtx, parts...)
	if err == nil && len(resp.Candidates) > 0 && len(resp.Candidates[0].Content.Parts) > 0 {
		return fmt.Sprintf("%v", resp.Candidates[0].Content.Parts[0]), nil
	}

	log.Printf("WARNING: Primary model failed (%v). Waiting %v then trying fallback...", err, FallbackWaitSeconds)
	time.Sleep(FallbackWaitSeconds)

	fallbackCtx, cancelFallback := context.WithTimeout(ctx, FallbackTimeout)
	defer cancelFallback()

	fallbackModel := client.GenerativeModel(FallbackModel)
	log.Printf("Pinging Model: %s (fallback) | Purpose: %s", FallbackModel, purpose)

	resp, err = fallbackModel.GenerateContent(fallbackCtx, parts...)
	if err != nil {
		return "", err
	}

	if len(resp.Candidates) > 0 && len(resp.Candidates[0].Content.Parts) > 0 {
		return fmt.Sprintf("%v", resp.Candidates[0].Content.Parts[0]), nil
	}
	return "", fmt.Errorf("no response from models")
}

func ExtractDataFromImage(imageBase64, userPrompt, mimeType string) (map[string]interface{}, error) {
	apiKey := GetEnv("GEMINI_API_KEY", "")
	if apiKey == "" {
		return nil, fmt.Errorf("GEMINI_API_KEY not set")
	}

	ctx := context.Background()
	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return nil, err
	}
	defer client.Close()

	dataBytes, err := base64.StdEncoding.DecodeString(imageBase64)
	if err != nil {
		return nil, err
	}

	today := time.Now().UTC().Format("January 02, 2006")
	systemPrompt := fmt.Sprintf(`You are a data extraction AI. Today's date is %s.
Extract structured data from the provided document image/PDF and the user's prompt. 
Return ONLY valid JSON with no explanation or markdown formatting.
Identify the action as 'add_expense' or 'add_task'. If it is a bill/receipt, use 'add_expense'.

For add_expense return: { "action": "add_expense", "name": "", "amount": 0, "due_date": "", "category": "bill", "notes": "" }
If a due date is not explicitly found, try to infer it from the user's prompt or the document, else leave empty. Use absolute dates (YYYY-MM-DD or readable).
User prompt: %s`, today, userPrompt)

	parts := []genai.Part{
		genai.Blob{MIMEType: mimeType, Data: dataBytes},
		genai.Text(systemPrompt),
	}

	respText, err := generateWithFallback(ctx, client, parts, "Document Extraction")
	if err != nil {
		return nil, err
	}

	return cleanAndParseJSON(respText)
}

func ExtractDataFromAudio(audioBase64, userPrompt, mimeType string) (map[string]interface{}, error) {
	apiKey := GetEnv("GEMINI_API_KEY", "")
	if apiKey == "" {
		return nil, fmt.Errorf("GEMINI_API_KEY not set")
	}

	ctx := context.Background()
	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return nil, err
	}
	defer client.Close()

	dataBytes, err := base64.StdEncoding.DecodeString(audioBase64)
	if err != nil {
		return nil, err
	}

	today := time.Now().UTC().Format("January 02, 2006")
	systemPrompt := fmt.Sprintf(`You are a data extraction AI. Today's date is %s.
Listen to the provided audio voice note and read the user's prompt (if any).
Extract structured data and return ONLY valid JSON with no explanation or markdown formatting.
Identify the action as 'add_task', 'add_expense', or 'add_reminder'. 

For add_task return: { "action": "add_task", "title": "", "note": "", "due_date": "", "due_time": "", "category": "personal" }
For add_expense return: { "action": "add_expense", "name": "", "amount": 0, "due_date": "", "category": "bill", "notes": "" }

If a due date is not explicitly found, try to infer it from the audio (e.g. "tomorrow"). Use absolute dates (YYYY-MM-DD).
User prompt (optional context): %s`, today, userPrompt)

	parts := []genai.Part{
		genai.Blob{MIMEType: mimeType, Data: dataBytes},
		genai.Text(systemPrompt),
	}

	respText, err := generateWithFallback(ctx, client, parts, "Audio Extraction")
	if err != nil {
		return nil, err
	}

	return cleanAndParseJSON(respText)
}

func cleanAndParseJSON(text string) (map[string]interface{}, error) {
	text = strings.TrimSpace(text)
	text = strings.TrimPrefix(text, "```json")
	text = strings.TrimPrefix(text, "```")
	text = strings.TrimSuffix(text, "```")
	text = strings.TrimSpace(text)

	var result map[string]interface{}
	err := json.Unmarshal([]byte(text), &result)
	return result, err
}
