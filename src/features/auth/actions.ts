"use server";

import { APIError } from "better-auth/api";
import type { Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth, isOwnerEmail } from "@/lib/auth";
import { capabilities } from "@/lib/env";

export type AuthFormState = { error?: string; success?: string };

const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email.");
const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .max(128, "That password is too long.");

function messageFrom(error: unknown, fallback: string): string {
  if (error instanceof APIError) return error.message || fallback;
  console.error(error);
  return fallback;
}

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Check the form and try again.";
}

export async function signInAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = z
    .object({ email: emailSchema, password: z.string().min(1, "Enter your password.") })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  try {
    await auth.api.signInEmail({ body: parsed.data, headers: await headers() });
  } catch (error: unknown) {
    return { error: messageFrom(error, "Couldn't sign in. Try again.") };
  }
  redirect("/studio");
}

export async function signUpAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = z
    .object({
      name: z.string().trim().min(1, "Enter your name.").max(80),
      email: emailSchema,
      password: passwordSchema,
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  if (!isOwnerEmail(parsed.data.email)) {
    return { error: "This app is private. Sign-ups are closed." };
  }

  try {
    await auth.api.signUpEmail({ body: parsed.data, headers: await headers() });
  } catch (error: unknown) {
    return { error: messageFrom(error, "Couldn't create the account. Try again.") };
  }
  redirect("/studio");
}

export async function forgotPasswordAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  try {
    await auth.api.requestPasswordReset({
      body: { email: parsed.data, redirectTo: "/reset-password" },
    });
  } catch (error: unknown) {
    // Don't reveal whether the account exists; just log real failures.
    console.error("Password reset request failed", error);
  }
  return {
    success: capabilities.email
      ? "If that email has an account, a reset link is on its way."
      : "If that email has an account, the reset link was written to the server log (email isn't set up yet).",
  };
}

export async function resetPasswordAction(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = z
    .object({ token: z.string().min(1, "This reset link is invalid."), password: passwordSchema })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  try {
    await auth.api.resetPassword({
      body: { token: parsed.data.token, newPassword: parsed.data.password },
    });
  } catch (error: unknown) {
    return { error: messageFrom(error, "This reset link has expired. Request a new one.") };
  }
  redirect("/sign-in?reset=1");
}

export async function signInWithGoogleAction(): Promise<void> {
  if (!capabilities.googleAuth) redirect("/sign-in");
  let url: string | undefined;
  try {
    const result = await auth.api.signInSocial({
      body: { provider: "google", callbackURL: "/studio", errorCallbackURL: "/sign-in" },
      headers: await headers(),
    });
    url = result.url;
  } catch (error: unknown) {
    console.error("Google sign-in failed", error);
  }
  // External Google consent URL; typed routes only know our own paths.
  redirect((url ?? "/sign-in") as Route);
}

export async function signOutAction(): Promise<void> {
  try {
    await auth.api.signOut({ headers: await headers() });
  } catch (error: unknown) {
    console.error("Sign-out failed", error);
  }
  redirect("/sign-in");
}
