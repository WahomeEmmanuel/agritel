import { Response } from "@/types/response";

export type Message = {
  role: "user" | "model";
  type: "text" | "llm_response" | "advice";
  content: string | Response;
};