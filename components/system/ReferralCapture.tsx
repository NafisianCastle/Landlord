"use client";

import { useEffect } from "react";

// Runs on every page load; if the URL carries ?ref=CODE, remembers it in a
// cookie so signUp (server action) or the OAuth callback can attribute the
// new account to it, whichever path the visitor takes to sign up.
export default function ReferralCapture() {
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (!ref) return;
    const maxAge = 60 * 60 * 24 * 30;
    document.cookie = `landlord_ref=${encodeURIComponent(ref)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  }, []);

  return null;
}
