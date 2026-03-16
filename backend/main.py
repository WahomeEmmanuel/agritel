import os

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import ChatRequest, Response
from services import get_agronomy_advice

if not os.getenv("GEMINI_API_KEY"):
    print("Error: GEMINI_API_KEY not found in environment!")

app = FastAPI(title="Agritel.AI API")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post(
    "/farm-advice", 
    response_model=Response,
    summary="Get Agricultural Advice",
    description="Processes farm data and conversation history to provide localized expert advice for Kenyan farmers."
)
async def handle_farm_advice(request: ChatRequest):
    try:
        return await get_agronomy_advice(request)
    except Exception as e:
        print(f"ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail="The agricultural advisor is unavailable. Try again.")

@app.get("/health", tags=["System"])
def health_check():
    """Confirms the API is online and the agricultural advisor is ready."""
    return {"status": "online", "service": "Agritel.AI"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)