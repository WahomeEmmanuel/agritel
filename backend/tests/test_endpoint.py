import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_check():
    """Test that the API is alive."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "online", "service": "Agritel.AI"}

def test_farm_advice_validation():
    """Test that the API correctly rejects incomplete requests."""
    # Sending empty data to trigger Pydantic validation error
    response = client.post("/farm-advice", json={})
    assert response.status_code == 422  # Unprocessable Entity

def test_farm_advice_structure():
    """
    Test a mock successful flow. 
    """
    payload = {
        "last_message": "How do I plant maize in Nakuru?",
        "context_history": [],
        "county": "Nakuru",
        "crop": "Maize"
    }
    response = client.post("/farm-advice", json=payload)
    
    # Check if the response matches our Response model
    assert response.status_code == 200
    data = response.json()
    assert "summary" in data
    assert "points" in data
    assert isinstance(data["points"], list)