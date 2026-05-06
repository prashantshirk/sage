package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"

	"golang.org/x/oauth2"
	"google.golang.org/api/gmail/v1"
	"google.golang.org/api/option"
)

type EmailSummary struct {
	MessageID   string `json:"message_id"`
	SenderName  string `json:"sender_name"`
	SenderEmail string `json:"sender_email"`
	Subject     string `json:"subject"`
	Date        string `json:"date"`
	Snippet     string `json:"snippet"`
}

type ActionItem struct {
	SenderName string `json:"sender_name"`
	Subject    string `json:"subject"`
	Summary    string `json:"summary"`
	Urgency    string `json:"urgency"`
}

func getGmailService(ctx context.Context, accessToken string) (*gmail.Service, error) {
	token := &oauth2.Token{AccessToken: accessToken}
	tokenSource := oauth2.StaticTokenSource(token)
	return gmail.NewService(ctx, option.WithTokenSource(tokenSource))
}

func FetchRecentEmails(accessToken string, maxResults int64) ([]EmailSummary, error) {
	ctx := context.Background()
	srv, err := getGmailService(ctx, accessToken)
	if err != nil {
		return nil, err
	}

	query := "newer_than:7d"
	r, err := srv.Users.Messages.List("me").Q(query).MaxResults(maxResults).Do()
	if err != nil {
		return nil, err
	}

	var emailList []EmailSummary
	for _, msg := range r.Messages {
		msgDetail, err := srv.Users.Messages.Get("me", msg.Id).Format("metadata").MetadataHeaders("From", "Subject", "Date").Do()
		if err != nil {
			continue
		}

		subject := "No Subject"
		sender := "Unknown Sender"
		date := ""

		if msgDetail.Payload != nil {
			for _, header := range msgDetail.Payload.Headers {
				name := strings.ToLower(header.Name)
				if name == "subject" {
					subject = header.Value
				} else if name == "from" {
					sender = header.Value
				} else if name == "date" {
					date = header.Value
				}
			}
		}

		senderName := sender
		senderEmail := ""
		if strings.Contains(sender, "<") && strings.Contains(sender, ">") {
			parts := strings.Split(sender, "<")
			senderName = strings.TrimSpace(parts[0])
			senderEmail = strings.TrimSuffix(parts[1], ">")
		}

		snippet := msgDetail.Snippet
		if len(snippet) > 100 {
			snippet = snippet[:100]
		}

		emailList = append(emailList, EmailSummary{
			MessageID:   msg.Id,
			SenderName:  senderName,
			SenderEmail: senderEmail,
			Subject:     subject,
			Date:        date,
			Snippet:     snippet,
		})
	}

	return emailList, nil
}

func ExtractActionItems(emails []EmailSummary) ([]ActionItem, error) {
	if len(emails) == 0 {
		return []ActionItem{}, nil
	}

	emailsJSON, _ := json.MarshalIndent(emails, "", "  ")

	systemPrompt := `You are an email triage assistant. Given these emails, identify which ones need action.
Focus especially on:
- Payment requests, fee reminders, or invoices.
- Requests for information or meetings.
- Direct questions from people.

DO NOT skip emails that ask for money or fees. 
Return a JSON array of action items only. Skip marketing, newsletters, or generic automated system notifications (unless they are bills).
For each actionable email return: { "sender_name": "...", "subject": "...", "summary": "one line, what action needed", "urgency": "high|medium|low" }
Return only the JSON array.`

	messages := []groqMessage{{Role: "user", Content: fmt.Sprintf("Emails: %s", emailsJSON)}}
	respText, err := CallGroq(messages, systemPrompt, 1000, 0.1, "Email Action Item Extraction")
	if err != nil {
		return nil, err
	}

	respText = strings.TrimSpace(respText)
	respText = strings.TrimPrefix(respText, "```json")
	respText = strings.TrimPrefix(respText, "```")
	respText = strings.TrimSuffix(respText, "```")
	respText = strings.TrimSpace(respText)

	var items []ActionItem
	err = json.Unmarshal([]byte(respText), &items)
	if err != nil {
		log.Printf("Failed to parse action items JSON: %v", err)
		return []ActionItem{}, nil
	}

	return items, nil
}
