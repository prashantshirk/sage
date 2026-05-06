package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
)

func getTelegramBotToken() string {
	return GetEnv("TELEGRAM_BOT_TOKEN", "")
}

func telegramAPIURL(method string) string {
	return fmt.Sprintf("https://api.telegram.org/bot%s/%s", getTelegramBotToken(), method)
}

func SendTelegramMessage(chatID, text, parseMode string, replyMarkup map[string]interface{}) (map[string]interface{}, error) {
	if parseMode == "" {
		parseMode = "Markdown"
	}

	payload := map[string]interface{}{
		"chat_id":    chatID,
		"text":       text,
		"parse_mode": parseMode,
	}

	if replyMarkup != nil {
		rmBytes, _ := json.Marshal(replyMarkup)
		payload["reply_markup"] = string(rmBytes)
	}

	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Post(telegramAPIURL("sendMessage"), "application/json", bytes.NewBuffer(jsonPayload))
	if err != nil {
		log.Printf("[TelegramService] send_message error: %v", err)
		return nil, err
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	return result, nil
}

func SendTelegramTyping(chatID string) {
	payload := map[string]interface{}{
		"chat_id": chatID,
		"action":  "typing",
	}
	jsonPayload, _ := json.Marshal(payload)
	client := &http.Client{Timeout: 5 * time.Second}
	client.Post(telegramAPIURL("sendChatAction"), "application/json", bytes.NewBuffer(jsonPayload))
}
