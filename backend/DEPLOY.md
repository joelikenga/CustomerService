# Deploying to Render with Keep-Alive

This guide explains how to deploy your Go backend to Render's free tier and keep it alive using a cron job.

## Why Keep-Alive?

Render's free tier spins down services after 15 minutes of inactivity. The cron job pings your service every 14 minutes to prevent this.

## Prerequisites

1. A GitHub account
2. A Render account (sign up at [render.com](https://render.com))
3. Your backend code pushed to a GitHub repository

## Step 1: Push Code to GitHub

```bash
cd /home/joelikenga/desktop/DEV/CustomerService/backend
git init
git add .
git commit -m "Initial commit"
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

## Step 2: Deploy to Render

### Option A: Using render.yaml (Recommended)

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **"New +"** → **"Blueprint"**
3. Connect your GitHub repository
4. Render will automatically detect `render.yaml` and create:
   - A **Web Service** for your backend
   - A **Cron Job** to keep it alive

### Option B: Manual Setup

If you prefer manual setup:

1. **Create Web Service:**
   - Click **"New +"** → **"Web Service"**
   - Connect your GitHub repo
   - Settings:
     - **Name:** `customer-service-backend`
     - **Runtime:** Go
     - **Build Command:** `go build -o bin/server cmd/main.go`
     - **Start Command:** `./bin/server`
     - **Plan:** Free

2. **Create Cron Job:**
   - Click **"New +"** → **"Cron Job"**
   - Settings:
     - **Name:** `keep-alive-cron`
     - **Schedule:** `*/14 * * * *` (every 14 minutes)
     - **Command:** `curl https://YOUR-SERVICE-NAME.onrender.com/health`

## Step 3: Configure Environment Variables

In your Render service dashboard, add any required environment variables (if needed for SMTP or other features).

## Step 4: Update Frontend

Once deployed, update your frontend widget to use the Render URL:

```typescript
// In ChatWidget.tsx, update API_ENDPOINT:
const API_ENDPOINT = "https://customer-service-backend.onrender.com/chat";
```

## Health Check

Your backend now has a `/health` endpoint that returns:
```json
{"status": "ok"}
```

This is used by:
- Render's health checks
- The cron job to keep the service alive

## Monitoring

- **Service Logs:** View in Render Dashboard → Your Service → Logs
- **Cron Job Logs:** View in Render Dashboard → Cron Job → Logs

## Important Notes

- **Free tier limitations:** 750 hours/month (enough for one service running 24/7)
- **Cold starts:** First request after inactivity may take 30-60 seconds
- **Cron job frequency:** Every 14 minutes keeps the service warm
- **Alternative:** Use external services like [UptimeRobot](https://uptimerobot.com/) or [cron-job.org](https://cron-job.org) for more reliable pinging

## Troubleshooting

### Service won't start
- Check logs in Render dashboard
- Verify `go.mod` and dependencies are correct
- Ensure port 8080 is used (Render expects this)

### Cron job not working
- Verify the service URL in the cron command
- Check cron job logs for errors
- Ensure the schedule syntax is correct

### Still spinning down
- Verify cron job is running (check logs)
- Consider using an external monitoring service as backup
