"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { syncPending } from "@/lib/offline/syncQueue";

// Mounted once in the protected layout so a walk started earlier — possibly
// in a tab that's since closed — still finishes syncing once connectivity
// returns, without needing BoundaryWalker itself to be mounted.
export default function SyncManager() {
  const router = useRouter();
  const [syncError, setSyncError] = useState(false);

  useEffect(() => {
    const trySync = async () => {
      try {
        const { finished, hadError } = await syncPending();
        setSyncError(hadError);
        if (finished.length > 0) router.refresh();
      } catch {
        setSyncError(true);
      }
    };

    void trySync();
    window.addEventListener("online", trySync);
    document.addEventListener("visibilitychange", trySync);

    return () => {
      window.removeEventListener("online", trySync);
      document.removeEventListener("visibilitychange", trySync);
    };
  }, [router]);

  if (!syncError) return null;

  return (
    <div
      role="alert"
      className="sticky top-0 z-50 bg-destructive/10 px-4 py-2 text-center text-sm text-destructive"
    >
      Some changes couldn&rsquo;t sync — will retry automatically.
    </div>
  );
}
