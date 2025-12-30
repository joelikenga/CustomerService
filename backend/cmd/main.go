// server/main.go

package main

import (
	"log"

	"customerService/internal/handlers"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env for SMTP configuration only (if needed)
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file loaded (OK)")
	} else {
		log.Println(".env loaded for SMTP configuration")
	}

	r := gin.Default()

	// CORS configuration
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

	r.OPTIONS("/*path", func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Status(204)
	})

	r.POST("/chat", handlers.Chat)

	log.Println("🚀 Backend server started on port 8080")
	log.Println("📝 Using client-side API keys (passed via Authorization header)")
	r.Run(":8080")
}