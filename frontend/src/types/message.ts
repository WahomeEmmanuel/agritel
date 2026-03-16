import { Response } from "@/types/response";

export type Message = {
  role: "user" | "model";
  type: "text" | "llm_response" | "advice";
  content: string | Response;
};

export interface ChatRequest {
  last_message: string;
  context_history: Message[];
  county: string;
  crop: string;
}