package handlers

import (
	"net/http"

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

	// Call AI
	answer, err := services.AskAI(req.Prompt)
	if err != nil {
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
