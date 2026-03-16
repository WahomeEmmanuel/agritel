import { Response } from "@/types/response";
import { ChatRequest } from "@/types/message";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const getFarmAdvice = async (data: ChatRequest): Promise<Response> => {
  const response = await fetch(`${API_BASE_URL}/farm-advice`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail || 'The agricultural advisor is currently busy.');
  }

  return response.json();
};