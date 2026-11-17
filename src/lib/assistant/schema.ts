import { z } from "zod";
import { ASSISTANT_LIMITS as L } from "@/lib/assistant/limits";

/** Strips control characters (except newline/tab) and normalizes Unicode (NFC). */
export function cleanText(value: string): string {
  return value
    .normalize("NFC")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
}

const text = (max: number) => z.string().transform(cleanText).pipe(z.string().max(max));

export const pageContextSchema = z.object({
  path: z
    .string()
    .max(L.maxPathChars)
    .regex(/^\/[^\s?#]*$/, "Path must start with / and contain no query or hash"),
  title: text(L.maxTitleChars).optional(),
  description: text(L.maxDescriptionChars).optional(),
  content: text(L.maxPageContentChars).optional(),
});

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: text(L.maxAssistantMessageChars),
});

export const chatRequestSchema = z.object({
  siteId: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/, "Invalid site id"),
  /** The new visitor message. */
  message: text(L.maxMessageChars).pipe(z.string().min(1, "Message is required")),
  /** Previous turns, oldest first. The server keeps only the most recent ones. */
  history: z.array(chatMessageSchema).max(50).default([]),
  page: pageContextSchema.optional(),
});

export type ChatRequest = z.output<typeof chatRequestSchema>;
