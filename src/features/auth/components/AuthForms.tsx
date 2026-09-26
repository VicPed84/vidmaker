"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, FormMessage } from "@/components/ui/Field";
import {
  forgotPasswordAction,
  resetPasswordAction,
  signInAction,
  signUpAction,
  type AuthFormState,
} from "@/features/auth/actions";

const INITIAL: AuthFormState = {};

export function SignInForm({ notice }: { notice?: string }) {
  const [state, action, pending] = useActionState(signInAction, INITIAL);
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormMessage error={state.error} success={state.error ? undefined : notice} />
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <Button type="submit" pending={pending}>
        Sign in
      </Button>
      <Link
        href="/forgot-password"
        className="self-start text-sm text-ink-muted underline-offset-4 hover:text-ink hover:underline"
      >
        Forgot your password?
      </Link>
    </form>
  );
}

export function SignUpForm() {
  const [state, action, pending] = useActionState(signUpAction, INITIAL);
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormMessage error={state.error} />
      <Field label="Name" name="name" autoComplete="name" required />
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={10}
        hint="At least 10 characters."
        required
      />
      <Button type="submit" pending={pending}>
        Create account
      </Button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, INITIAL);
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormMessage error={state.error} success={state.success} />
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Button type="submit" pending={pending}>
        Send reset link
      </Button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, INITIAL);
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormMessage error={state.error} />
      <input type="hidden" name="token" value={token} />
      <Field
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={10}
        hint="At least 10 characters."
        required
      />
      <Button type="submit" pending={pending}>
        Set new password
      </Button>
    </form>
  );
}
