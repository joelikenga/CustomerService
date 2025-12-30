package models

type ChatRequest struct {
	Prompt         string `json:"prompt"`
	DeveloperEmail string `json:"developer_email"`
	// API key is passed via Authorization header, not in request body
}

type ChatResponse struct {
	Answer string `json:"answer"`
}
