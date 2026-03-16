from pydantic import BaseModel
from typing import Optional, List, Union, Dict, Any

class Response(BaseModel):
    summary: str
    points: Optional[List[str]] = []
    cost_estimate_per_acre_kes: Optional[int] = None
    warning: Optional[str] = None
    pro_tip: Optional[str] = None

class ChatMessage(BaseModel):
    role: str  # "user" or "model"
    type: str  # "text" or "llm_response"
    content: Union[str, Response, Dict[str, Any]] # This can be a string or the Response object

class ChatRequest(BaseModel):
    last_message: str
    context_history: List[ChatMessage]
    county: str
    crop: str