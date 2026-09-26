// Better Auth's own handler: needed for the Google OAuth callback and the
// password-reset link. All app writes still go through Server Actions.
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

export const { GET, POST } = toNextJsHandler(auth);
