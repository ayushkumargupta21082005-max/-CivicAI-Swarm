# 🏙️ CivicAI Swarm — Community Hero: Hyperlocal Problem Solver

> > Powered by **Google Gemini 2.5 Pro** · Built with Node.js + Express · JSON File Storage

---

## 📌 What is CivicAI Swarm?

CivicAI Swarm is a full-stack civic issue reporting and management platform. Citizens can report local problems (potholes, broken streetlights, sewage, etc.), and Google Gemini AI instantly classifies, prioritizes, detects duplicates, and recommends resolutions — all automatically.

---

## 🗂️ Project Structure

```
civicai-swarm/
├── server.js          → Express server entry point
├── routes.js          → All API route handlers
├── gemini.js          → All Google Gemini AI integrations
├── package.json       → Dependencies and scripts
├── data/
│   └── issues.json    → Auto-created JSON database (flat file)
└── public/
    ├── index.html     → Landing page
    ├── report.html    → Citizen issue reporting page
    ├── dashboard.html → Public issue tracker dashboard
    ├── admin.html     → Government admin panel
    ├── analytics.html → AI-powered analytics page
    ├── style.css      → Complete stylesheet
    └── script.js      → Shared frontend utilities
```

---

## ⚙️ Setup & Installation

### 1. Prerequisites

- Node.js v18 or higher
- A Google AI Studio API key → [Get one free here](https://aistudio.google.com/app/apikey)

### 2. Install dependencies

```bash
cd civicai-swarm
npm install
```

### 3. Create your `.env` file

Create a file named `.env` in the root of the project:

```env
GEMINI_API_KEY=your_google_ai_studio_api_key_here
PORT=3000
```

### 4. Start the server

```bash
npm start
```

Or with auto-reload during development:

```bash
npm run dev
```

### 5. Open in browser

```
http://localhost:3000
```

---

## 🌐 Pages

| URL | Page | Description |
|---|---|---|
| `/` | Landing Page | Hero, features, recent issues |
| `/report` | Report Issue | Submit + Gemini Vision analysis |
| `/dashboard` | Dashboard | Browse and filter all issues |
| `/admin` | Admin Panel | Manage, assign, resolve issues |
| `/analytics` | Analytics | Charts + Gemini trend prediction |

---

## 🔌 API Endpoints

### Issues

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/issues` | List all issues (supports `?severity=`, `?status=`, `?limit=`, `?offset=`) |
| `GET` | `/api/issues/:id` | Get single issue |
| `POST` | `/api/issues` | Create issue (triggers full Gemini AI pipeline) |
| `PATCH` | `/api/issues/:id` | Update status, assignee, notes |
| `DELETE` | `/api/issues/:id` | Delete issue |
| `POST` | `/api/issues/:id/upvote` | Upvote an issue |
| `POST` | `/api/issues/:id/comments` | Add a comment |

### AI Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/ai/analyze-image` | Gemini Vision image analysis (multipart/form-data) |
| `POST` | `/api/ai/recommend/:id` | Re-run resolution recommendation |
| `POST` | `/api/ai/reprioritize/:id` | Re-calculate priority score |
| `GET` | `/api/ai/trends` | Run community trend prediction |

### Analytics & Utilities

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/analytics` | Full analytics breakdown |
| `POST` | `/api/seed` | Load 5 sample issues with AI analysis |

---

## 🤖 AI Features (All via Gemini 2.5 Pro)

### 1. 🏷️ Issue Classification
Every new report is classified into one of 14 categories (Roads, Water, Electricity, Safety, etc.) and routed to the correct government department automatically.

### 2. 🚨 Severity Detection
Gemini evaluates health risk, safety risk, and estimated affected population to assign Critical / High / Medium / Low severity.

### 3. 🔍 Duplicate Detection
New reports are compared against existing issues. Gemini detects semantic duplicates even if the wording is different, and recommends merge or ignore.

### 4. 📊 Priority Scoring
A 0–100 priority score is computed using urgency, community demand, impact area, and SLA requirements. Escalation flag is set for scores above threshold.

### 5. 💡 Resolution Recommendation
Gemini generates immediate actions, short-term steps, long-term solutions, responsible teams, and citizen advisories specific to each issue.

### 6. 📈 Trend Prediction
Analyzes patterns across all issues to surface hot categories, emerging crises, high-risk areas, and next-week predictions with a community health score.

### 7. 📷 Gemini Vision (Bonus)
Upload a photo on the Report page — Gemini Vision detects the civic issue, suggests a title and description, and identifies visible hazards automatically.

---

## 📦 Tech Stack

| Layer | Technology |
|---|---|
| AI | Google Gemini 2.5 Pro, Gemini Vision |
| Backend | Node.js, Express.js |
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Storage | JSON flat-file (data/issues.json) |
| File Upload | Multer |
| ID Generation | UUID v4 |

---

## 🤖 Google Technologies Utilized

- Google Gemini 2.5 Pro
- Google Gemini Vision
- Google AI Studio
- Gemini API
- AI-powered issue classification
- AI-powered severity detection
- AI-generated resolution recommendations
- AI-powered trend prediction

---

## 🚀 First-Time Quick Start

1. Start the server (`npm start`)
2. Go to `http://localhost:3000/admin`
3. Click **"🌱 Load Sample Data"** — this seeds 5 real issues analyzed by Gemini AI
4. Visit `/dashboard` to see all issues with AI scores
5. Visit `/analytics` and click **"✦ Run Trend Prediction"** for live AI insights
6. Visit `/report` to submit your own issue with optional image upload

---

## 🔒 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | ✅ Yes | Your Google AI Studio API key |
| `PORT` | ❌ No | Server port (default: 3000) |

---

## 📝 Sample Issue Payload (POST /api/issues)

```json
{
  "title": "Large pothole on MG Road near bus stop",
  "description": "A massive pothole has developed causing vehicle damage and accidents.",
  "location": "MG Road, near Bus Stop 14",
  "ward": "Ward 7",
  "reporter_name": "Raj Kumar",
  "reporter_email": "raj@example.com"
}
```

Gemini AI will return full analysis including category, severity, priority score, and resolution steps.

---

## 🌍 Impact

CivicAI Swarm helps citizens and local authorities collaborate more efficiently by automating issue classification, prioritization, and resolution planning. The platform reduces manual effort, improves response times, and provides AI-driven insights for smarter civic governance.

---

## 🏆 Hackathon — Problem Statement

**COMMUNITY HERO – HYPERLOCAL PROBLEM SOLVER**

This project addresses the gap between citizens experiencing local civic problems and government bodies responsible for resolving them. CivicAI Swarm uses AI to make the reporting → resolution pipeline faster, smarter, and transparent for everyone.

---

*CivicAI Swarm — Built for Community Hero Hackathon · Powered by Google Gemini 2.5 Pro*
