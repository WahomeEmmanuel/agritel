export interface Response {
  summary: string;
  points?: string[];
  cost_estimate_per_acre_kes: number;
  warning: string;
  pro_tip: string;
}