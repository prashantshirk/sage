package main

import (
	"context"
	"fmt"
	"strings"
	"time"

	"golang.org/x/oauth2"
	"google.golang.org/api/calendar/v3"
	"google.golang.org/api/option"
)

type CalendarEvent struct {
	GoogleEventID string `json:"google_event_id"`
	Title         string `json:"title"`
	StartTime     string `json:"start_time"`
	EndTime       string `json:"end_time"`
	Description   string `json:"description"`
}

func getCalendarService(ctx context.Context, accessToken string) (*calendar.Service, error) {
	token := &oauth2.Token{AccessToken: accessToken}
	tokenSource := oauth2.StaticTokenSource(token)
	return calendar.NewService(ctx, option.WithTokenSource(tokenSource))
}

func FetchTodaysEvents(accessToken, timezoneStr string) ([]CalendarEvent, error) {
	ctx := context.Background()
	srv, err := getCalendarService(ctx, accessToken)
	if err != nil {
		return nil, err
	}

	loc, err := time.LoadLocation(timezoneStr)
	if err != nil {
		loc = time.UTC
	}

	now := time.Now().In(loc)
	startOfToday := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, loc)
	endOfToday := time.Date(now.Year(), now.Month(), now.Day(), 23, 59, 59, 999999999, loc)

	events, err := srv.Events.List("primary").
		TimeMin(startOfToday.Format(time.RFC3339)).
		TimeMax(endOfToday.Format(time.RFC3339)).
		SingleEvents(true).
		OrderBy("startTime").
		Do()

	if err != nil {
		return nil, err
	}

	var simplified []CalendarEvent
	for _, item := range events.Items {
		start := item.Start.DateTime
		if start == "" {
			start = item.Start.Date
		}
		end := item.End.DateTime
		if end == "" {
			end = item.End.Date
		}

		simplified = append(simplified, CalendarEvent{
			GoogleEventID: item.Id,
			Title:         item.Summary,
			StartTime:     start,
			EndTime:       end,
			Description:   item.Description,
		})
	}

	return simplified, nil
}

func CreateCalendarEvent(accessToken, title, dateStr, timeStr, description string, durationMinutes int) (string, error) {
	ctx := context.Background()
	srv, err := getCalendarService(ctx, accessToken)
	if err != nil {
		return "", err
	}

	event := &calendar.Event{
		Summary:     title,
		Description: description,
	}

	dateOnlyStr := strings.Split(dateStr, "T")[0]
	dateOnlyStr = strings.Split(dateOnlyStr, " ")[0]

	if timeStr != "" {
		startDtStr := fmt.Sprintf("%sT%s:00+05:30", dateOnlyStr, timeStr) // Defaulting to IST for simplicity
		startDt, err := time.Parse(time.RFC3339, startDtStr)
		if err == nil {
			endDt := startDt.Add(time.Duration(durationMinutes) * time.Minute)
			event.Start = &calendar.EventDateTime{
				DateTime: startDt.Format(time.RFC3339),
				TimeZone: "Asia/Kolkata",
			}
			event.End = &calendar.EventDateTime{
				DateTime: endDt.Format(time.RFC3339),
				TimeZone: "Asia/Kolkata",
			}
		}
	} else {
		event.Start = &calendar.EventDateTime{
			Date:     dateOnlyStr,
			TimeZone: "Asia/Kolkata",
		}
		event.End = &calendar.EventDateTime{
			Date:     dateOnlyStr,
			TimeZone: "Asia/Kolkata",
		}
	}

	createdEvent, err := srv.Events.Insert("primary", event).Do()
	if err != nil {
		return "", err
	}

	return createdEvent.Id, nil
}

func DeleteCalendarEvent(accessToken, eventID string) error {
	ctx := context.Background()
	srv, err := getCalendarService(ctx, accessToken)
	if err != nil {
		return err
	}

	return srv.Events.Delete("primary", eventID).Do()
}
