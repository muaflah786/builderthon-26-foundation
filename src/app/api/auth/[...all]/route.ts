import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/server/auth/auth";

// Better Auth owns /api/auth/* (its own response format, not the API envelope).
export const { GET, POST } = toNextJsHandler(auth);
