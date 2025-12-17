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

	// Parse JSON
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request body",
		})
		return
	}

	// Call AI (pass optional api key)
	answer, err := services.AskAI(req.Prompt, req.ApiKey)
	if err != nil {
		// no API key configured on server
		if errors.Is(err, services.ErrNoAPIKey) {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "No OpenAI API key configured on server. Set OPENAI_API_KEY or provide api_key in the request.",
			})
			return
		}

		// rate limit / quota -> return 429 with helpful message
		low := strings.ToLower(err.Error())
		if strings.Contains(low, "429") || strings.Contains(low, "too many requests") || strings.Contains(low, "quota") {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "OpenAI rate limit / quota exceeded. Please check your plan/billing or try again later.",
			})
			return
		}

		// other errors
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	// Return response
	c.JSON(http.StatusOK, models.ChatResponse{
		Answer: answer,
	})
}
