import { z } from "zod";
import { simulateRequestSchema } from "@/lib/schemas";

export const NAVIGATION = {
  districts: "Город сейчас",
  measures: "Все меры",
  transport: "Транспорт",
  ecology: "Экология",
  social: "Социальная сфера",
  safety: "Безопасность",
  services: "Городские сервисы",
  receipt: "Мой план",
  result: "Результаты",
} as const;

export type NavigationTarget = keyof typeof NAVIGATION;
const navigationSchema = z.enum(["districts", "measures", "transport", "ecology", "social", "safety", "services", "receipt", "result"]);

export const consultantRequestSchema = simulateRequestSchema.extend({
  message: z.string().trim().min(1).max(600),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(400),
  }).strict()).max(2).default([]),
  hasResult: z.boolean().default(false),
}).strict();

export const consultantAnswerSchema = z.object({
  message: z.string().trim().min(1).max(1800),
  actions: z.array(navigationSchema).max(3),
}).strict();

export type ConsultantRequest = z.infer<typeof consultantRequestSchema>;
export type ConsultantAnswer = z.infer<typeof consultantAnswerSchema>;
export const consultantResponseSchema = consultantAnswerSchema.extend({
  source: z.enum(["llm", "local"]),
});
