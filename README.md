# InterviewAI 🎙️

> An AI-powered mock interview platform that turns your CV into a personalised voice interview — with real-time transcription, LLM-generated questions, and instant feedback.

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?style=flat-square&logo=fastapi)
![Groq](https://img.shields.io/badge/Groq-LLaMA%203.3-orange?style=flat-square)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-SQLAlchemy-336791?style=flat-square&logo=postgresql)
![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector%20DB-blueviolet?style=flat-square)
![Clerk](https://img.shields.io/badge/Clerk-Auth-6C47FF?style=flat-square)

---

## What is InterviewAI?

InterviewAI generates interview questions directly from your uploaded CV — not generic templates. Upload your resume, pick how many questions you want, answer them by voice, and receive an AI-generated score with detailed feedback the moment your session ends.

Every question is grounded in your actual experience, skills, and projects using a RAG (Retrieval-Augmented Generation) pipeline.

---

## Features

- **CV-personalised questions** — Questions generated from your actual CV content via RAG, not generic templates
- **Voice interview** — Questions spoken aloud via TTS; you answer by speaking
- **Real-time transcription** — Answers transcribed live using Groq Whisper STT
- **AI feedback** — Score out of 100, strengths, improvement areas, and CV-specific feedback after every session
- **Multiple CVs** — Upload and manage multiple resumes; start a fresh interview from any
- **Session history** — Every interview saved with full Q&A transcript and feedback
- **Flexible sessions** — Choose 3, 5, 7, or 10 questions per session
- **Secure** — All endpoints and WebSocket connections protected with Clerk JWT auth

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| Next.js 14 (App Router) | Frontend framework |
| TypeScript | Type safety |
| Tailwind CSS + Custom CSS | Styling and design system |
| Clerk | Authentication (sign in/up) |
| Sonner | Toast notifications |
| WebSocket API | Real-time interview communication |

### Backend
| Technology | Purpose |
|---|---|
| FastAPI | REST API + WebSocket server |
| Python | Backend language |
| SQLAlchemy | ORM for database models |
| PostgreSQL | Relational database |
| Clerk JWT + JWKS | Auth verification |
| PyPDF2 + python-docx | CV parsing |

### AI & ML
| Model / Service | Purpose |
|---|---|
| Groq LLaMA 3.3 70B | Question generation + feedback evaluation |
| Groq Orpheus TTS | Text-to-speech for reading questions aloud |
| Groq Whisper large-v3 | Speech-to-text for transcribing answers |
| Mistral `mistral-embed` | CV text embeddings |
| ChromaDB Cloud | Vector database for CV chunk storage |
| LangChain | LLM orchestration and prompt management |

---

## Architecture

```
User uploads CV
      │
      ▼
FastAPI parses PDF/DOCX
      │
      ▼
Text split into chunks (LangChain RecursiveCharacterTextSplitter)
      │
      ▼
Chunks embedded via Mistral AI → stored in ChromaDB Cloud
      │
      ▼
User starts interview via WebSocket
      │
      ▼
Backend fetches all CV chunks from ChromaDB
      │
      ▼
LLaMA 3.3 70B generates N personalised questions
      │
      ▼
For each question:
  ├── Question sent as text → frontend
  ├── Groq TTS converts to audio → streamed to browser
  ├── Browser plays audio + records user answer
  ├── Audio blob sent back over WebSocket
  ├── Groq Whisper transcribes audio → text
  └── Answer saved to PostgreSQL
      │
      ▼
LLaMA 3.3 70B evaluates all Q&A pairs + CV
      │
      ▼
Feedback saved to PostgreSQL (score, summary, strengths, improvements, CV feedback)
      │
      ▼
Results shown to user + saved to history
```

---

## Database Schema

```
users
  └── uploaded_files (CV files)
        └── interview_sessions
              ├── interview_questions (question + answer per index)
              └── interview_feedback (score, summary, strengths, improvements, cv_feedback)
```

---

## Project Structure

```
ai-powered-interview-assistant/
│
├── frontend/                          # Next.js app
│   ├── app/
│   │   ├── dashboard/                 # Dashboard page (upload + file list)
│   │   │   ├── page.tsx
│   │   │   ├── DashboardClient.tsx
│   │   │   └── ResumeUpload.tsx
│   │   ├── history/                   # Interview history page
│   │   │   ├── page.tsx
│   │   │   └── HistoryClient.tsx
│   │   ├── practice/                  # How it works page
│   │   │   └── page.tsx
│   │   ├── (auth)/                    # Clerk sign-in / sign-up
│   │   ├── layout.tsx
│   │   ├── page.tsx                   # Home / landing page
│   │   └── globals.css
│   ├── components/
│   │   ├── Navbar.tsx
│   │   ├── InterviewSession.tsx       # Main interview UI component
│   │   └── UploadedFilesList.tsx      # CV list with interview launcher
│   ├── hooks/
│   │   └── useInterview.ts            # WebSocket + audio logic
│   └── middleware.ts
│
└── backend/                           # FastAPI app
    ├── main.py                        # All REST endpoints
    ├── routers/
    │   └── interview_ws.py            # WebSocket interview handler
    ├── services/
    │   ├── interview.py               # Question gen, TTS, STT, feedback
    │   ├── embeddings.py              # Mistral embeddings
    │   ├── chunks.py                  # Text chunking
    │   └── vector_store.py            # ChromaDB operations
    └── db/
        ├── models.py                  # SQLAlchemy models
        ├── base.py                    # DB engine + session
        └── auth.py                    # Clerk JWT verification
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL (local or Supabase)
- Accounts for: Groq, Mistral AI, ChromaDB Cloud, Clerk

---

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/ai-powered-interview-assistant.git
cd ai-powered-interview-assistant
```

---

### 2. Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory:

```env
# Groq
GROQ_API_KEY=gsk_your_groq_api_key

# Mistral
MISTRAL_API_KEY=your_mistral_api_key

# ChromaDB Cloud
CHROMA_API_KEY=your_chroma_api_key
CHROMA_TENANT=your_chroma_tenant
CHROMA_DATABASE=interview-assistant

# Clerk
CLERK_JWKS_URL=https://your-clerk-domain.clerk.accounts.dev/.well-known/jwks.json

# PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/interviewai
```

Run the backend:

```bash
uvicorn main:app --reload --port 8000
```

---

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env.local` file in the `frontend/` directory:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_key
CLERK_SECRET_KEY=sk_test_your_key

# FastAPI URLs
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8000
NEXT_PUBLIC_FASTAPI_WS_URL=ws://localhost:8000
FASTAPI_URL=http://localhost:8000
```

Run the frontend:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

### 4. Database Setup

The tables are created automatically on backend startup via SQLAlchemy:

```python
Base.metadata.create_all(bind=engine)
```

No manual migrations needed for local development.

---

## Deployment

| Service | Platform | Notes |
|---|---|---|
| Frontend | [Vercel](https://vercel.com) | Free, auto-deploys from GitHub |
| Backend | [Railway](https://railway.app) | $5 free credit/month, supports WebSockets |
| PostgreSQL | [Supabase](https://supabase.com) | Free tier, no expiry |
| Vector DB | [Chroma Cloud](https://trychroma.com) | Free tier |

### Backend start command for Railway:
```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

### Update CORS for production in `main.py`:
```python
allow_origins=[
    "http://localhost:3000",
    "https://your-app.vercel.app",
]
```

### Update env vars for production:
```env
# Frontend (.env.production)
NEXT_PUBLIC_FASTAPI_URL=https://your-app.railway.app
NEXT_PUBLIC_FASTAPI_WS_URL=wss://your-app.railway.app
FASTAPI_URL=https://your-app.railway.app
```

---

## Environment Variables Reference

### Backend
| Variable | Description |
|---|---|
| `GROQ_API_KEY` | Groq API key (get from console.groq.com) |
| `MISTRAL_API_KEY` | Mistral API key (get from console.mistral.ai) |
| `CHROMA_API_KEY` | ChromaDB Cloud API key |
| `CHROMA_TENANT` | ChromaDB Cloud tenant ID |
| `CHROMA_DATABASE` | ChromaDB database name |
| `CLERK_JWKS_URL` | Clerk JWKS endpoint for JWT verification |
| `DATABASE_URL` | PostgreSQL connection string |

### Frontend
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `NEXT_PUBLIC_FASTAPI_URL` | Backend HTTP URL (client-side) |
| `NEXT_PUBLIC_FASTAPI_WS_URL` | Backend WebSocket URL (client-side) |
| `FASTAPI_URL` | Backend HTTP URL (server-side only) |

---

## License

MIT License — feel free to use this project for learning, portfolios, or building on top of it.

---

## Author

Built by **Vansh** — [GitHub](https://github.com/yourusername) · [LinkedIn](https://linkedin.com/in/yourusername)

---

> Made with Next.js, FastAPI, Groq, Mistral AI, ChromaDB, PostgreSQL and Clerk