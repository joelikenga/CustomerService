// handlers/chat.go

package handlers

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"customerService/internal/models"
	"customerService/internal/services"
)

func Chat(c *gin.Context) {
	var req models.ChatRequest

	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":       "Invalid request format.",
			"code":        "INVALID_REQUEST",
			"show_socials": false,
		})
		return
	}

	// Extract API key from Authorization header
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":       "Missing API key. Provide it in Authorization header.",
			"code":        "NO_API_KEY",
			"show_socials": false,
		})
		return
	}

	apiKey := strings.TrimPrefix(authHeader, "Bearer ")
	if apiKey == authHeader {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":       "Invalid Authorization header format. Use: Bearer {api_key}",
			"code":        "INVALID_KEY_FORMAT",
			"show_socials": false,
		})
		return
	}

	// Pass API key from client to AskAI
	answer, err := services.AskAI(req.Prompt, req.DeveloperEmail, apiKey)
	if err != nil {
		var aiErr *services.AIError
		if errors.As(err, &aiErr) {
			statusCode := getStatusCodeForErrorType(aiErr.Type)
			c.JSON(statusCode, gin.H{
				"error":        aiErr.UserMessage,
				"code":         aiErr.Type,
				"user_message": aiErr.UserMessage,
				"show_socials": aiErr.ShowSocials,
			})
			return
		}

		if errors.Is(err, services.ErrNoAPIKey) {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"error":        "Service configuration error. Please contact support.",
				"code":         "NO_API_KEY",
				"show_socials": true,
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error":        "Something went wrong. Please try again.",
			"code":         "UNEXPECTED_ERROR",
			"show_socials": false,
		})
		return
	}

	c.JSON(http.StatusOK, models.ChatResponse{
		Answer: answer,
	})
}

func getStatusCodeForErrorType(errorType string) int {
	switch errorType {
	case "QUOTA_EXCEEDED", "RATE_LIMIT", "INVALID_KEY":
		return http.StatusServiceUnavailable
	case "CONTEXT_LENGTH", "CONTENT_POLICY":
		return http.StatusBadRequest
	case "TIMEOUT", "NETWORK_ERROR":
		return http.StatusGatewayTimeout
	case "SERVICE_ERROR":
		return http.StatusBadGateway
	default:
		return http.StatusInternalServerError
	}
}