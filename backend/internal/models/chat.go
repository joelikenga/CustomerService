package models

type ChatRequest struct {
	Prompt string `json:"prompt"`
	ApiKey string `json:"api_key,omitempty"`
}

type ChatResponse struct {
	Answer string `json:"answer"`
}
