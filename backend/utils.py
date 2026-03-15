from typing import List, Dict, Any
from models import ChatMessage

def format_history_for_gemini(history: List[ChatMessage]) -> List[Dict[str, Any]]:
    gemini_history = []
    for msg in history:
        if msg.type == "llm_response":
            # Using .get() for dicts or dot notation for objects
            content = msg.content.get("summary") if isinstance(msg.content, dict) else msg.content.summary
        else:
            content = msg.content
            
        gemini_history.append({
            "role": "user" if msg.role == "user" else "model",
            "parts": [{"text": str(content)}]
        })
    return gemini_history