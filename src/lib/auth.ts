import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import { db } from "@/lib/db";
import { capabilities, env } from "@/lib/env";
import { sendEmail } from "@/lib/email";

export function isOwnerEmail(email: string): boolean {
  return env.OWNER_EMAILS.includes(email.trim().toLowerCase());
}

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your VidMaker password",
        text: `Someone asked to reset the password for this account.\n\nSet a new one here (link expires in 1 hour):\n${url}\n\nIf this wasn't you, ignore this email.`,
      });
    },
  },
  socialProviders:
    capabilities.googleAuth && env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {},
  user: {
    additionalFields: {
      premiumUntil: { type: "date", required: false, input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Private tool: refuse any account that isn't on the owner list,
        // whether it comes from email sign-up or Google.
        before: async (user) => {
          if (!isOwnerEmail(user.email)) {
            throw new APIError("FORBIDDEN", {
              message: "This app is private. Sign-ups are closed.",
            });
          }
          return { data: user };
        },
      },
    },
  },
  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;

export async function getSession(): Promise<AuthSession | null> {
  try {
    return await auth.api.getSession({ headers: await headers() });
  } catch (error: unknown) {
    // Let Next.js control-flow errors (dynamic rendering bailout) through.
    unstable_rethrow(error);
    console.error("Failed to read session", error);
    return null;
  }
}

/** For pages and actions that need a signed-in user. */
export async function requireUser(): Promise<AuthSession["user"]> {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return session.user;
}

/**
 * Who may use the video instrument. While this is a private tool the owner
 * list grants access; once billing ships, premiumUntil takes over.
 */
export function hasStudioAccess(user: {
  email: string;
  premiumUntil?: Date | null;
}): boolean {
  if (isOwnerEmail(user.email)) return true;
  return Boolean(user.premiumUntil && user.premiumUntil > new Date());
}
