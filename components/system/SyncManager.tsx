"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { syncPending } from "@/lib/offline/syncQueue";

// Mounted once in the protected layout so a walk started earlier — possibly
// in a tab that's since closed — still finishes syncing once connectivity
// returns, without needing BoundaryWalker itself to be mounted.
export default function SyncManager() {
  const router = useRouter();

  useEffect(() => {
    const trySync = async () => {
      const { finished } = await syncPending();
      if (finished.length > 0) router.refresh();
    };

    void trySync();
    window.addEventListener("online", trySync);
    document.addEventListener("visibilitychange", trySync);

    return () => {
      window.removeEventListener("online", trySync);
      document.removeEventListener("visibilitychange", trySync);
    };
  }, [router]);

  return null;
}
