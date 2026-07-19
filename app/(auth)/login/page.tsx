"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn } from "@/app/actions/auth";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signIn, undefined);

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Log in</h1>
      <form action={formAction} className="flex flex-col gap-3">
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
          {pending ? "Logging in..." : "Log in"}
        </button>
      </form>
      <p className="text-sm">
        No account?{" "}
        <Link href="/signup" className="underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
