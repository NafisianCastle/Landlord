"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp } from "@/app/actions/auth";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signUp, undefined);

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Sign up</h1>
      <p className="text-sm text-neutral-600">
        14-day free trial, no card required.
      </p>
      <form action={formAction} className="flex flex-col gap-3">
        <input
          name="fullName"
          type="text"
          placeholder="Full name"
          required
          className="rounded border px-3 py-2"
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          required
          className="rounded border px-3 py-2"
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          required
          minLength={6}
          className="rounded border px-3 py-2"
        />
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
        >
          {pending ? "Creating account..." : "Create account"}
        </button>
      </form>
      <p className="text-sm">
        Already have an account?{" "}
        <Link href="/login" className="underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
