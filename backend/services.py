import os
import json
import google.generativeai as genai
from utils import format_history_for_gemini
from models import ChatRequest

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-1.5-flash')

async def get_agronomy_advice(request: ChatRequest):
    # Chat history
    past_chats = format_history_for_gemini(request.context_history)
    
    # Start the session
    chat_session = model.start_chat(history=past_chats)

    # THE MASTER PROMPT
    detailed_system_prompt = f"""
    You are 'Agritel.AI Agronomist', a senior agricultural expert specializing in Kenyan farming systems.
    
    ENVIRONMENTAL CONTEXT:
    - User Location: {request.county} County, Kenya.
    - Targeted Crop: {request.crop}.
    
    CORE DIRECTIVES:
    1. Provide high-value, localized advice specific to the soil and climate of {request.county}.
    2. The 'points' field must be used flexibly: 
       - For sequential steps during "How-to" queries.
       - For technical requirements/specifications during "What" queries.
       - As an empty list [] if the summary provides a complete, simple answer.
    3. Use Kenyan Shillings (KES) for all financial estimations.
    4. Maintain a professional, helpful, and authoritative tone.

    CURRENT USER INQUIRY: {request.last_message}
    
    RESPONSE FORMAT (Strict JSON):
    {{
      "summary": "Comprehensive professional overview",
      "points": ["Actionable detail 1", "Actionable detail 2"],
      "cost_estimate_per_acre_kes": integer_only,
      "warning": "Critical risk/safety alert (or empty string)",
      "pro_tip": "Expert-level 'insider' insight (or empty string)"
    }}
    """

    # Generate content using the session to maintain memory
    raw_response = chat_session.send_message(
        detailed_system_prompt,
        generation_config={"response_mime_type": "application/json"}
    )

    data = json.loads(raw_response.text)
    
    # Final data safety check
    if "points" not in data: data["points"] = []
    
    return data