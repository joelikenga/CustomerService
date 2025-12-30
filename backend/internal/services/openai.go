// services/openai.go

package services

import (
	"context"
	"errors"
	"fmt"
	"net/smtp"
	"os"
	"strings"
	"time"

	openai "github.com/sashabaranov/go-openai"
)

var ErrNoAPIKey = errors.New("no_api_key")

type AIError struct {
	Type           string
	OriginalError  string
	UserMessage    string
	ShowSocials    bool // NEW: whether to show social media alternatives
}

func (e *AIError) Error() string {
	return e.OriginalError
}

// AskAI now takes API key from client (not environment)
func AskAI(prompt string, devEmail string, apiKey string) (string, error) {
	if apiKey == "" {
		return "", ErrNoAPIKey
	}

	client := openai.NewClient(apiKey)

	model := os.Getenv("OPENAI_MODEL")
	if model == "" {
		model = "gpt-4o-mini"
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
			errLower := strings.ToLower(err.Error())

			// Quota/Billing errors - notify developer, show socials to user
			if strings.Contains(errLower, "insufficient_quota") || 
			   strings.Contains(errLower, "quota") ||
			   strings.Contains(errLower, "billing") {
				if devEmail != "" {
					go sendErrorNotification(devEmail, "Quota/Billing Issue", err.Error(), "QUOTA_EXCEEDED")
				}
				return "", &AIError{
					Type:          "QUOTA_EXCEEDED",
					OriginalError: err.Error(),
					UserMessage:   "We're currently experiencing technical difficulties. Please reach out through our social channels below for immediate assistance!",
					ShowSocials:   true,
				}
			}

			// Rate limit - retry, then notify and show socials
			if strings.Contains(errLower, "429") || strings.Contains(errLower, "too many requests") {
				if i < len(backoffs)-1 {
					continue
				}
				if devEmail != "" {
					go sendErrorNotification(devEmail, "Rate Limit Exceeded", err.Error(), "RATE_LIMIT")
				}
				return "", &AIError{
					Type:          "RATE_LIMIT",
					OriginalError: err.Error(),
					UserMessage:   "We're experiencing high demand right now. Our team is working on a quick fix! Meanwhile, feel free to contact us directly:",
					ShowSocials:   true,
				}
			}

			// Invalid API key - critical, notify immediately
			if strings.Contains(errLower, "invalid") && (strings.Contains(errLower, "api") || strings.Contains(errLower, "key")) ||
			   strings.Contains(errLower, "unauthorized") ||
			   strings.Contains(errLower, "401") {
				if devEmail != "" {
					go sendErrorNotification(devEmail, "CRITICAL: Invalid API Key", err.Error(), "INVALID_KEY")
				}
				return "", &AIError{
					Type:          "INVALID_KEY",
					OriginalError: err.Error(),
					UserMessage:   "The provided API key is invalid. Please check your API key and try again.",
					ShowSocials:   false,
				}
			}

			// Context length - user error, no notification
			if strings.Contains(errLower, "context_length") || 
			   strings.Contains(errLower, "maximum context") ||
			   strings.Contains(errLower, "tokens") {
				return "", &AIError{
					Type:          "CONTEXT_LENGTH",
					OriginalError: err.Error(),
					UserMessage:   "Your message is too long. Please try a shorter message.",
					ShowSocials:   false,
				}
			}

			// Content policy - user error, no notification
			if strings.Contains(errLower, "content_policy") || 
			   strings.Contains(errLower, "content filter") ||
			   strings.Contains(errLower, "policy violation") {
				return "", &AIError{
					Type:          "CONTENT_POLICY",
					OriginalError: err.Error(),
					UserMessage:   "Your message couldn't be processed. Please rephrase and try again.",
					ShowSocials:   false,
				}
			}

			// Timeout - retry then fail gracefully
			if strings.Contains(errLower, "timeout") || 
			   strings.Contains(errLower, "deadline exceeded") {
				if i < len(backoffs)-1 {
					continue
				}
				return "", &AIError{
					Type:          "TIMEOUT",
					OriginalError: err.Error(),
					UserMessage:   "Request took too long. Please try again.",
					ShowSocials:   false,
				}
			}

			// Server errors - retry then notify
			if strings.Contains(errLower, "500") || 
			   strings.Contains(errLower, "502") || 
			   strings.Contains(errLower, "503") ||
			   strings.Contains(errLower, "server error") ||
			   strings.Contains(errLower, "service unavailable") {
				if i < len(backoffs)-1 {
					continue
				}
				if devEmail != "" {
					go sendErrorNotification(devEmail, "OpenAI Service Error", err.Error(), "SERVICE_ERROR")
				}
				return "", &AIError{
					Type:          "SERVICE_ERROR",
					OriginalError: err.Error(),
					UserMessage:   "Our AI service is temporarily down. We're fixing it! You can reach us here:",
					ShowSocials:   true,
				}
			}

			// Network errors - retry
			if strings.Contains(errLower, "connection") || 
			   strings.Contains(errLower, "network") ||
			   strings.Contains(errLower, "dial") {
				if i < len(backoffs)-1 {
					continue
				}
				return "", &AIError{
					Type:          "NETWORK_ERROR",
					OriginalError: err.Error(),
					UserMessage:   "Connection issue. Please check your internet and try again.",
					ShowSocials:   false,
				}
			}

			// Unknown error on last retry
			if i == len(backoffs)-1 {
				if devEmail != "" {
					go sendErrorNotification(devEmail, "Unknown Error", err.Error(), "UNKNOWN_ERROR")
				}
				return "", &AIError{
					Type:          "UNKNOWN_ERROR",
					OriginalError: err.Error(),
					UserMessage:   "Something unexpected happened. Please try again or contact us below:",
					ShowSocials:   true,
				}
			}
		}

		if len(resp.Choices) == 0 {
			return "", &AIError{
				Type:          "NO_RESPONSE",
				OriginalError: "no response from AI",
				UserMessage:   "No response received. Please try again.",
				ShowSocials:   false,
			}
		}

		return resp.Choices[0].Message.Content, nil
	}

	if lastErr != nil {
		return "", &AIError{
			Type:          "UNKNOWN_ERROR",
			OriginalError: lastErr.Error(),
			UserMessage:   "Something went wrong. Please try again.",
			ShowSocials:   false,
		}
	}
	return "", errors.New("unknown error from AI")
}

func sendErrorNotification(devEmail, errorType, errorDetails, errorCode string) {
	smtpHost := os.Getenv("SMTP_HOST")
	smtpPort := os.Getenv("SMTP_PORT")
	smtpUser := os.Getenv("SMTP_USER")
	smtpPass := os.Getenv("SMTP_PASSWORD")
	fromEmail := os.Getenv("FROM_EMAIL")

	if devEmail == "" || smtpHost == "" || smtpPort == "" || smtpUser == "" || smtpPass == "" {
		fmt.Printf("Email not configured. Error: %s - %s\n", errorType, errorDetails)
		return
	}

	if fromEmail == "" {
		fromEmail = smtpUser
	}

	subject := fmt.Sprintf("🚨 ALERT: AI Customer Service - %s", errorType)
	body := fmt.Sprintf(`
Hello Developer,

Your AI Customer Service widget has encountered an issue that requires immediate attention.

Error Type: %s
Error Code: %s
Time: %s

Error Details:
%s

Recommended Actions:
%s

⚠️ Users are currently being shown alternative contact options (social media links).

---
AI Customer Service Widget SDK
`, errorType, errorCode, time.Now().Format(time.RFC1123), errorDetails, getRecommendedAction(errorCode))

	message := []byte(fmt.Sprintf("From: %s\r\n"+
		"To: %s\r\n"+
		"Subject: %s\r\n"+
		"\r\n"+
		"%s\r\n", fromEmail, devEmail, subject, body))

	auth := smtp.PlainAuth("", smtpUser, smtpPass, smtpHost)
	addr := fmt.Sprintf("%s:%s", smtpHost, smtpPort)
	err := smtp.SendMail(addr, auth, fromEmail, []string{devEmail}, message)

	if err != nil {
		fmt.Printf("Failed to send error notification email: %v\n", err)
	} else {
		fmt.Printf("✅ Error notification sent to %s for %s\n", devEmail, errorType)
	}
}

func getRecommendedAction(errorCode string) string {
	actions := map[string]string{
		"QUOTA_EXCEEDED":  "1. Check your OpenAI billing dashboard\n2. Upgrade your plan if needed\n3. Add payment method if missing",
		"RATE_LIMIT":      "1. Consider upgrading your OpenAI plan for higher rate limits\n2. Implement request queuing if traffic is high\n3. Contact OpenAI support for rate limit increase",
		"INVALID_KEY":     "1. Verify your OpenAI API key is correct\n2. Check if the key has been revoked\n3. Generate a new API key from OpenAI dashboard",
		"SERVICE_ERROR":   "1. Check OpenAI status page: https://status.openai.com\n2. Wait a few minutes and monitor\n3. Contact OpenAI support if issue persists",
		"UNKNOWN_ERROR":   "1. Check the error details above\n2. Verify your OpenAI account status\n3. Review recent changes to your configuration",
	}

	if action, exists := actions[errorCode]; exists {
		return action
	}
	return "Please review the error details and check your OpenAI account settings."
}