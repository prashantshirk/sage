package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// RegisterAuthRoutes sets up the auth endpoints
func RegisterAuthRoutes(r *gin.Engine) {
	auth := r.Group("/auth")
	{
		auth.GET("/google/login", googleLogin)
		auth.GET("/callback", googleCallback)
		auth.GET("/me", requireAuth, getMe)
		auth.PATCH("/me", requireAuth, updateMe)
		auth.POST("/logout", requireAuth, logout)
		auth.POST("/refresh-tokens", requireAuth, refreshTokens)
	}
}

var googleScopes = []string{
	"openid",
	"email",
	"profile",
	"https://www.googleapis.com/auth/calendar",
	"https://www.googleapis.com/auth/gmail.readonly",
}

func googleLogin(c *gin.Context) {
	clientID := GetEnv("GOOGLE_CLIENT_ID", "")
	redirectURI := GetEnv("GOOGLE_REDIRECT_URI", "")

	params := url.Values{}
	params.Add("client_id", clientID)
	params.Add("redirect_uri", redirectURI)
	params.Add("response_type", "code")
	params.Add("scope", strings.Join(googleScopes, " "))
	params.Add("access_type", "offline")
	params.Add("prompt", "consent")

	authURL := "https://accounts.google.com/o/oauth2/v2/auth?" + params.Encode()
	c.JSON(http.StatusOK, gin.H{"auth_url": authURL})
}

func googleCallback(c *gin.Context) {
	code := c.Query("code")
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing OAuth code"})
		return
	}

	clientID := GetEnv("GOOGLE_CLIENT_ID", "")
	clientSecret := GetEnv("GOOGLE_CLIENT_SECRET", "")
	redirectURI := GetEnv("GOOGLE_REDIRECT_URI", "")

	// Exchange code for token
	data := url.Values{}
	data.Set("code", code)
	data.Set("client_id", clientID)
	data.Set("client_secret", clientSecret)
	data.Set("redirect_uri", redirectURI)
	data.Set("grant_type", "authorization_code")

	resp, err := http.PostForm("https://oauth2.googleapis.com/token", data)
	if err != nil || resp.StatusCode != http.StatusOK {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to fetch token"})
		return
	}
	defer resp.Body.Close()

	var tokenData struct {
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
		ExpiresIn    int    `json:"expires_in"`
		Error        string `json:"error"`
	}
	json.NewDecoder(resp.Body).Decode(&tokenData)

	if tokenData.Error != "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Token exchange failed: " + tokenData.Error})
		return
	}

	// Fetch profile
	req, _ := http.NewRequest("GET", "https://www.googleapis.com/oauth2/v2/userinfo", nil)
	req.Header.Add("Authorization", "Bearer "+tokenData.AccessToken)
	profileResp, err := http.DefaultClient.Do(req)
	if err != nil || profileResp.StatusCode != http.StatusOK {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unable to fetch Google profile"})
		return
	}
	defer profileResp.Body.Close()

	var profile map[string]interface{}
	json.NewDecoder(profileResp.Body).Decode(&profile)

	email := profile["email"].(string)

	// DB Ops
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	usersCollection := DB.Collection("users")
	var user User
	err = usersCollection.FindOne(ctx, bson.M{"email": email}).Decode(&user)

	now := time.Now().UTC()
	expiry := now.Add(time.Duration(tokenData.ExpiresIn) * time.Second)

	if err != nil { // User not found, create new
		user = User{
			ID:                 primitive.NewObjectID(),
			Email:              email,
			Name:               profile["name"].(string),
			Avatar:             profile["picture"].(string),
			GoogleAccessToken:  tokenData.AccessToken,
			GoogleRefreshToken: tokenData.RefreshToken,
			GoogleTokenExpiry:  &expiry,
			Timezone:           "Asia/Kolkata",
			Currency:           "INR",
			BriefingTime:       "08:00",
			Notifications: map[string]bool{
				"daily_briefing": true,
				"bill_reminders": true,
				"overdue_alerts": true,
			},
			CreatedAt: now,
			UpdatedAt: now,
		}
		_, err = usersCollection.InsertOne(ctx, user)
	} else {
		update := bson.M{
			"$set": bson.M{
				"google_access_token": tokenData.AccessToken,
				"google_token_expiry": expiry,
				"updated_at":          now,
			},
		}
		if tokenData.RefreshToken != "" {
			update["$set"].(bson.M)["google_refresh_token"] = tokenData.RefreshToken
		}
		usersCollection.UpdateOne(ctx, bson.M{"_id": user.ID}, update)
	}

	// Generate JWT
	jwtToken, err := generateJWT(user.ID.Hex(), email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	frontendURL := GetEnv("FRONTEND_URL", "http://localhost:3000")
	c.Redirect(http.StatusFound, frontendURL+"/auth/callback?token="+jwtToken)
}

// generateJWT generates a new JWT token
func generateJWT(userID, email string) (string, error) {
	secret := GetEnv("JWT_SECRET_KEY", "default_secret")
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": userID,
		"email":   email,
		"exp":     time.Now().Add(time.Hour * 24 * 7).Unix(),
	})
	return token.SignedString([]byte(secret))
}

// requireAuth is a middleware that verifies the JWT token
func requireAuth(c *gin.Context) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	secret := GetEnv("JWT_SECRET_KEY", "default_secret")

	token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return []byte(secret), nil
	})

	if err != nil || !token.Valid {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	userID := claims["user_id"].(string)
	c.Set("user_id", userID)
	c.Next()
}

func getMe(c *gin.Context) {
	userID := c.GetString("user_id")
	objID, _ := primitive.ObjectIDFromHex(userID)

	var user User
	err := DB.Collection("users").FindOne(context.Background(), bson.M{"_id": objID}).Decode(&user)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}

func updateMe(c *gin.Context) {
	userID := c.GetString("user_id")
	objID, _ := primitive.ObjectIDFromHex(userID)

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	if unlink, ok := req["unlink_telegram"].(bool); ok && unlink {
		DB.Collection("users").UpdateOne(context.Background(), bson.M{"_id": objID}, bson.M{"$unset": bson.M{"telegram_chat_id": ""}})
		c.JSON(http.StatusOK, gin.H{"success": true, "message": "Telegram unlinked"})
		return
	}

	update := bson.M{}
	if notifs, ok := req["notifications"]; ok {
		update["notifications"] = notifs
	}

	if len(update) > 0 {
		DB.Collection("users").UpdateOne(context.Background(), bson.M{"_id": objID}, bson.M{"$set": update})
	}

	var user User
	DB.Collection("users").FindOne(context.Background(), bson.M{"_id": objID}).Decode(&user)
	c.JSON(http.StatusOK, user)
}

func logout(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "Logged out"})
}

func refreshTokens(c *gin.Context) {
	userID := c.GetString("user_id")
	objID, _ := primitive.ObjectIDFromHex(userID)

	var user User
	err := DB.Collection("users").FindOne(context.Background(), bson.M{"_id": objID}).Decode(&user)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if user.GoogleRefreshToken == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No refresh token available"})
		return
	}

	data := url.Values{}
	data.Set("client_id", GetEnv("GOOGLE_CLIENT_ID", ""))
	data.Set("client_secret", GetEnv("GOOGLE_CLIENT_SECRET", ""))
	data.Set("refresh_token", user.GoogleRefreshToken)
	data.Set("grant_type", "refresh_token")

	resp, err := http.PostForm("https://oauth2.googleapis.com/token", data)
	if err != nil || resp.StatusCode != http.StatusOK {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Token refresh failed"})
		return
	}
	defer resp.Body.Close()

	var tokenData struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
	}
	json.NewDecoder(resp.Body).Decode(&tokenData)

	expiry := time.Now().UTC().Add(time.Duration(tokenData.ExpiresIn) * time.Second)

	DB.Collection("users").UpdateOne(context.Background(), bson.M{"_id": objID}, bson.M{
		"$set": bson.M{
			"google_access_token": tokenData.AccessToken,
			"google_token_expiry": expiry,
			"updated_at":          time.Now().UTC(),
		},
	})

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// RefreshGoogleTokenIfNeeded is used by other services to ensure a valid Google token before API calls
func RefreshGoogleTokenIfNeeded(userID string) (string, error) {
	objID, _ := primitive.ObjectIDFromHex(userID)
	var user User
	err := DB.Collection("users").FindOne(context.Background(), bson.M{"_id": objID}).Decode(&user)
	if err != nil {
		return "", err
	}

	if user.GoogleAccessToken == "" {
		return "", fmt.Errorf("no google access token")
	}

	// Check if expired
	if user.GoogleTokenExpiry != nil && time.Now().UTC().Add(5*time.Minute).After(*user.GoogleTokenExpiry) {
		if user.GoogleRefreshToken == "" {
			return user.GoogleAccessToken, nil // return stale
		}

		data := url.Values{}
		data.Set("client_id", GetEnv("GOOGLE_CLIENT_ID", ""))
		data.Set("client_secret", GetEnv("GOOGLE_CLIENT_SECRET", ""))
		data.Set("refresh_token", user.GoogleRefreshToken)
		data.Set("grant_type", "refresh_token")

		resp, err := http.PostForm("https://oauth2.googleapis.com/token", data)
		if err == nil && resp.StatusCode == http.StatusOK {
			var tokenData struct {
				AccessToken string `json:"access_token"`
				ExpiresIn   int    `json:"expires_in"`
			}
			json.NewDecoder(resp.Body).Decode(&tokenData)
			resp.Body.Close()

			expiry := time.Now().UTC().Add(time.Duration(tokenData.ExpiresIn) * time.Second)
			DB.Collection("users").UpdateOne(context.Background(), bson.M{"_id": objID}, bson.M{
				"$set": bson.M{
					"google_access_token": tokenData.AccessToken,
					"google_token_expiry": expiry,
					"updated_at":          time.Now().UTC(),
				},
			})
			return tokenData.AccessToken, nil
		}
	}

	return user.GoogleAccessToken, nil
}
