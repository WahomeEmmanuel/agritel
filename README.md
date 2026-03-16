# Agritel.AI 🌾

**Smart Agricultural Advisory & Precision Planning for Kenyan Farmers**

Agritel.AI is a specialized AI platform designed to bridge the gap between complex climate data and actionable farm management. Focused specifically on the Kenyan landscape, it provides seasonal strategies, intercropping advice, and cost estimations.

---

## Live Demo

| Service | URL |
|---|---|
| Backend (Railway) | https://agritel-production.up.railway.app/docs |
| Frontend (Vercel) | https://agritel.emmanuelgathage.dev/ |

---

## Key Features

- **Hyper-Local Context** — Tailored advice for specific Kenyan sub-regions and Agro-Ecological Zones (AEZ)
- **Seasonal Intelligence** — Analyses the 2026 Long Rains and Short Rains windows to provide `[PLANT NOW]` or `[WAIT]` verdicts
- **Dynamic Intercropping** — Intelligent follow-up support for multi-crop systems (e.g., Maize + Beans)
- **Persistent History** — LocalStorage-backed chat persistence for returning farmers

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Lucide React |
| Backend | FastAPI (Python 3.12), Uvicorn |
| AI Engine | Google Gemini 2.5 Flash |
| Deployment | Railway (Backend) + Vercel (Frontend) |

---

## Setup Instructions

### Prerequisites

- Python 3.12+
- Node.js 18+
- Gemini API Key — [Google AI Studio](https://aistudio.google.com)

---

### 1. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` folder:

```env
GEMINI_API_KEY=your_api_key_here
```

Start the server:

```bash
uvicorn main:app --reload
```

---

### 2. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env.local` file in the `frontend/` folder:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the app:

```bash
npm run dev
```

---

## Docker Setup Instructions

### The easiest way to run the entire stack is using Docker Compose:

Create a `.env` file in the root folder of the project :

```env
GEMINI_API_KEY=your_api_key_here
```

Run:
   ```bash
   docker compose up --build
   ```

---

## Access System

Frontend
```bash
http://localhost:3000
```

Backend
```bash
http://localhost:8000/docs
```
---

## Testing

Run backend tests:

```bash
cd backend
pytest
```

Test coverage includes:

| Test | Description |
|---|---|
| Geocoding Resilience | Verified handling of `"County, Sub-location"` input strings |
| JSON Integrity | Validates that the LLM returns the strictly required response schema |
| Pydantic Validation | Handles `Optional` types for cost estimates and warnings |

---

Run frontend tests:

```bash
cd frontend
npm test -- --watchAll=false
```

## Prompt Engineering Strategy

Agritel.AI uses a **Hierarchical Prompting** approach:

1. **Persona Grounding** — Forces the model to act as a Kenyan Senior Agronomist
2. **Constraint Enforcement** — Strict JSON output schema ensures frontend stability
3. **Knowledge Injection** — Hardcoded AEZ zones and Kenyan crop calendars prevent hallucinations on planting dates

> Full prompt documentation is available in [`PROMPT_DOCUMENTATION.md`](./PROMPT_DOCUMENTATION.md)

---

## Future Roadmap

| Feature | Timeline |
|---|---|
| Forestry Tracker — Satellite-based forest cover analysis | Q2 2026 |
| Market Price Integration — Real-time commodity prices from local markets | TBD |

