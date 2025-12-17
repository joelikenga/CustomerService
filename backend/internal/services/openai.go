package services

import (
	"context"
	"errors"
	"os"
	"strings"
	"time"

	openai "github.com/sashabaranov/go-openai"
)

var ErrNoAPIKey = errors.New("no_api_key")

// use apiKey if non-empty, else use OPENAI_API_KEY env var
func AskAI(prompt string, apiKey string) (string, error) {
	key := apiKey
	if key == "" {
		key = os.Getenv("OPENAI_API_KEY")
	}
	if key == "" {
		return "", ErrNoAPIKey
	}

	client := openai.NewClient(key)

	// prefer highest-capability model by default; can be overridden via OPENAI_MODEL
	model := os.Getenv("OPENAI_MODEL")
	if model == "" {
		model = "gpt-4o" // use a high-capability model by default
	}

	var lastErr error
	backoffs := []time.Duration{0, 1 * time.Second, 2 * time.Second}

	for i, wait := range backoffs {
		if wait > 0 {
			time.Sleep(wait)
		}

		resp, err := client.CreateChatCompletion(
			context.Background(),
			openai.ChatCompletionRequest{
				Model: model,
				Messages: []openai.ChatCompletionMessage{
					{
						Role:    openai.ChatMessageRoleUser,
						Content: prompt,
					},
				},
			},
		)

		if err != nil {
			lastErr = err
			// retry on rate-limit/quota errors
			low := strings.ToLower(err.Error())
			if (strings.Contains(low, "429") || strings.Contains(low, "too many requests") || strings.Contains(low, "quota")) && i < len(backoffs)-1 {
				// continue to next retry
				continue
			}
			return "", err
		}

		if len(resp.Choices) == 0 {
			return "", errors.New("no response from AI")
		}

		return resp.Choices[0].Message.Content, nil
	}

	// return last observed error
	if lastErr != nil {
		return "", lastErr
	}
	return "", errors.New("unknown error from AI")
}
