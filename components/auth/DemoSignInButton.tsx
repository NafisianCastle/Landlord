"use client";

import { useActionState } from "react";
import { demoSignIn } from "@/app/actions/auth";

/** Signs straight into the shared read-only demo account. */
export default function DemoSignInButton({
  label,
  pendingLabel,
  className,
  children,
}: {
  label: string;
  pendingLabel: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(demoSignIn, undefined);
  return (
    <form action={formAction} className="contents">
      <button type="submit" className={className} disabled={pending} aria-busy={pending}>
        {pending ? pendingLabel : label}
        {children}
      </button>
      {state?.error && (
        <p role="alert" className="w-full text-sm text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
