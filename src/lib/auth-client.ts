import { createAuthClient } from "better-auth/react";

/**
 * Browser auth client. Same origin as the app, so no baseURL is needed.
 * Server code uses `@/server/auth/session` instead.
 */
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
