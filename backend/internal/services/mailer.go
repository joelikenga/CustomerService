// services/mailer.go

package services

import (
	"fmt"
	"net/smtp"
	"os"
)

func NotifyDev(subject, body string) {
	devEmail := os.Getenv("DEV_ALERT_EMAIL")
	if devEmail == "" {
		return
	}

	from := os.Getenv("SMTP_FROM")
	pass := os.Getenv("SMTP_PASS")
	host := os.Getenv("SMTP_HOST")
	port := os.Getenv("SMTP_PORT")

	if from == "" || pass == "" || host == "" || port == "" {
		return
	}

	msg := []byte(fmt.Sprintf(
		"Subject: %s\r\n\r\n%s",
		subject,
		body,
	))

	auth := smtp.PlainAuth("", from, pass, host)
	_ = smtp.SendMail(host+":"+port, auth, from, []string{devEmail}, msg)
}
