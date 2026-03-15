import { FarmingAdvice } from "@/types/advice";

export type Message = {
  role: "user" | "model";
  type: "text" | "advice";
  content: string | FarmingAdvice;
};