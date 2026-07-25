"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div style={{ display: "flex", minHeight: "100vh", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", padding: "1.5rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ color: "#666" }}>An unexpected error occurred. Please try again.</p>
          <button
            onClick={() => unstable_retry()}
            style={{ padding: "0.5rem 1rem", borderRadius: "0.375rem", background: "#000", color: "#fff" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
