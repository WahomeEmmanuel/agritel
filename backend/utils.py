from typing import List, Dict, Any
from models import ChatMessage

def format_history_for_gemini(history: List[ChatMessage]) -> List[Dict[str, Any]]:
    gemini_history = []
    for msg in history:
        msg_type = msg.get("type") 
        msg_role = msg.get("role")
        msg_content = msg.get("content")

        if msg_type == "llm_response":
            # Using .get() for dicts or dot notation for objects
            content = msg_content.get("summary") if isinstance(msg_content, dict) else msg_content.summary
        else:
            content = msg_content
            
        gemini_history.append({
            "role": "user" if msg_role == "user" else "model",
            "parts": [{"text": str(content)}]
        })
    return gemini_history