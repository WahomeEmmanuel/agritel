import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from utils import format_history_for_gemini

def test_format_history_valid_conversion():
    """Test that frontend history is correctly mapped to Gemini's role/parts format."""
    mock_history = [
        {"role": "user", "content": "How do I grow tomatoes?"},
        {"role": "model", "content": "Tomatoes need sunlight."}
    ]
    
    formatted = format_history_for_gemini(mock_history)
    
    # Assertions based on Gemini's expected SDK format
    assert len(formatted) == 2
    assert formatted[0]["role"] == "user"
    assert "parts" in formatted[0]
    assert formatted[1]["role"] == "model"
    assert formatted[1]["parts"][0]["text"] == "Tomatoes need sunlight."

def test_format_history_empty_list():
    """Ensure the formatter handles a fresh chat with no history gracefully."""
    assert format_history_for_gemini([]) == []