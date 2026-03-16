# agritel
**Smart Agricultural Advisory & Precision Planning for Kenyan Farmers**

An AI-powered agricultural advisor for Kenyan farmers. Built with FastAPI and Next.js, leveraging Claude/Gemini to provide real-time planting schedules, variety recommendations and cost estimates for the different Rain seasons.

---

## Live Demo
- **Backend (Railway):** []
- **Frontend (Vercel):** https://agritel.emmanuelgathage.dev/

---

## Tech Stack
- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, Lucide React.
- **Backend:** FastAPI (Python 3.12), Uvicorn.
- **AI Engine:** Google Gemini 1.5 Flash (Optimized with System Instructions).
- **Deployment:** Railway (Backend) & Vercel (Frontend).

---

## Setup Instructions

### 1. Prerequisites
- Python 3.12+
- Node.js 18+
- Gemini API Key (via Google AI Studio)

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

```bash
Create a .env file in the backend folder:

GEMINI_API_KEY=your_api_key_here
PORT=8000
```


