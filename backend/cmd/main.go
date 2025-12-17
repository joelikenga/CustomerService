package main

import (
	"log"

	"customerService/internal/handlers"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// load .env if present so OPENAI_API_KEY can be provided via .env during development
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file loaded (OK if you set OPENAI_API_KEY in environment)")
	} else {
		log.Println(".env loaded")
	}

	r := gin.Default()

	// allow frontend to call backend - set CORS headers for all requests
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// ensure OPTIONS preflight is handled (catch-all) — register before other routes
	r.OPTIONS("/*path", func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Status(204)
	})

	r.POST("/chat", handlers.Chat)

	r.Run(":8080") // backend runs here
}
