# BackendQaSoftware

A Node.js/Express backend for QA operations integrating MongoDB, Redis, Bull queues, scheduled cron jobs, and external services (Bitrix24 and Zoho). It powers user auth/presence, evaluations, escalations (with audio uploads), marketing submissions, and analytics.

## Overview
- Express API with security middleware (helmet, CORS)
- MongoDB via Mongoose for persistence
- Redis for caching and as a backing store for Bull queues
- Scheduled jobs using node-cron (cleanup, reports, backup, Bitrix sync)
- Bitrix24 integration endpoints and webhooks
- Zoho API client with OAuth token refresh and retries
- Feature domains: users, evaluations, escalations, marketing, analytics

## Architecture
- `index.js`: App entrypoint, env validation, DB/Redis connect, cron init, route mounting
- `config/connection.js`: Mongo and Redis connection helpers
- `controllers/`: Route handlers per domain
- `routes/`: Express routers mapping HTTP to controllers
- `models/`: Mongoose schemas (User, Evaluation, Escalation, Marketing, Lead/Contact/Deal)
- `queues/`: Bull queues and processors (evaluation, marketing)
- `cron/`: Job scheduler and job implementations
- `services/`: External services: Zoho OAuth client, email service, Bitrix API stub
- `middlewares/`: Auth (JWT) and error handling
- `uploads/audio`: Storage for uploaded audio files (Multer)

## Environment Variables
Create a `.env` in `BackendQaSoftware/` with at least:
```
PORT=3001
MONGO_URL=mongodb://localhost:27017/qa
REDIS_URL=redis://127.0.0.1:6379
JWT_SECRET=change_me
FRONTEND_URL=http://localhost:5173

# Optional / integrations
BITRIX_API_BASE_URL=https://yourdomain.bitrix24.com/rest/1/your_token/
EMAIL_USER=you@example.com
EMAIL_PASSWORD=app_password

# Zoho
ZOHO_CLIENT_ID=1000.xxxxxx
ZOHO_CLIENT_SECRET=xxxxxxx
ZOHO_REDIRECT_URI=http://localhost/callback
ZOHO_REFRESH_TOKEN=1000.xxxxxx
```

## Setup
```bash
# from BackendQaSoftware directory
npm install
npm run dev # or: node index.js
```
Ensure MongoDB and Redis are running locally (or update URLs above).

## Scripts
- `start`: node index.js
- `dev`: nodemon index.js (if configured)

## API Overview
Base URL: `http://localhost:3001`

- Users (`/api/users`)
  - POST `/register-user`, `/login-user`
  - POST `/forgot-password` (send 6-digit OTP via email, stored in Redis 10 min)
  - POST `/verify-otp` (validate OTP, marks email as verified for reset)
  - POST `/reset-password` (requires verified OTP; updates MongoDB password)
  - GET (auth) `/my-profile`, `/getallusers`, `/online-users`, `/online-users-count`
  - PUT (auth) `/update-status`, `/update-activity`, `/set-online`, `/set-offline`

- Evaluations (`/api/evaluations`)
  - POST `/` (create), `/bulk` (queue many)
  - GET `/getevaluations` (filters + pagination), `/getevaluationbyid/:id`
  - PUT `/evaluations/:id` (update)
  - DELETE `/evaluations/:id`
  - GET `/queue/status`, `/totalevaluationcounts`, `/datefilterevaluation`, `/owner/:ownerId`

- Escalations (`/api/escalations`)
  - POST `/` (supports `audio` upload via multipart/form-data)
  - GET `/` (list), `/:id`, `/owner/:ownerId`, `/agent/:agentName`, `/totalescalationscounts`, `/datefiltereescalation`
  - PUT `/:id` (update, optional `audio`)
  - DELETE `/:id`

- Marketing (`/api/marketing`)
  - POST `/` (create), `/bulk` (create many)
  - GET `/getmarketing`, `/getmarketingbyid/:id`, `/queue/status`, `/totalmarketingcounts`
  - PUT `/marketing/:id`
  - DELETE `/marketing/:id`

- Analytics (`/api/analytics`)
  - GET `/overview?range=7d|30d|month|quarter`
  - GET `/getEvaluationAnalytics`, `/getEscalationAnalytics`, `/getMarketingAnalytics`

- Bitrix24 (`/api/bitrix24`)
  - GET `/leads`, `/contacts`, `/deals`, `/leads/:id`, `/user-leads/:id`, `/search-leads?q=...`
  - POST `/lead-button`
  - POST `/webhook` (mapped to escalation create)
  - GET `/:identifier` (flexible escalation lookup)

- Cron Management
  - GET `/api/cron/status` (list schedules and next runs)
  - POST `/api/cron/trigger/:job` (cleanup|reports|backup|bitrix) [not for prod]

- Health
  - GET `/health`

## Example Requests
- Create evaluation
```bash
curl -X POST http://localhost:3001/api/evaluations \
  -H "Content-Type: application/json" \
  -d '{"owner":"<userId>","useremail":"u@example.com","leadID":123,"agentName":"Alice","mod":"Inbound","teamleader":"TL"}'
```

- Bulk queue evaluations
```bash
curl -X POST http://localhost:3001/api/evaluations/bulk \
  -H "Content-Type: application/json" \
  -d '[{"owner":"<userId>","useremail":"u@example.com","leadID":1,"agentName":"Alice","mod":"Inbound","teamleader":"TL"}]'
```

- Upload escalation with audio
```bash
curl -X POST http://localhost:3001/api/escalations \
  -F audio=@call.wav -F agentName=Alice -F leadID=123
```

## Notes
- Some service stubs exist (e.g., `services/bitrixApi.js`); ensure implementations and envs are configured for production.
- Protect cron and sensitive routes behind auth/roles in production.
- `ZohoService` auto-refreshes tokens and retries 401s; configure envs correctly.
