package main

import "github.com/gin-gonic/gin"


func main() {
	router := gin.Default()
	router.post("/chat",chatHandler)
	router.Run(":8080")
}

