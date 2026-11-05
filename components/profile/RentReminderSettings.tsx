"use client";

import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type Status =
  | "loading"
  | "unsupported"
  | "denied"
  | "unsubscribed"
  | "subscribed"
  | "error";

async function getInitialStatus(): Promise<Status> {
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("Notification" in window)
  )
    return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  return subscription ? "subscribed" : "unsubscribed";
}

async function getReadyRegistration() {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("Service worker unavailable")),
          10_000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
  if (bytes.length !== 65 || bytes[0] !== 4)
    throw new Error("Invalid push key");
  return bytes;
}

export default function RentReminderSettings({
  publicKey,
}: {
  publicKey: string | null;
}) {
  const t = useTranslations("RentReminderSettings");
  const [status, setStatus] = useState<Status>("loading");
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unavailableId = useId();

  useEffect(() => {
    let cancelled = false;
    getInitialStatus().then(
      (next) => {
        if (!cancelled) setStatus(next);
      },
      () => {
        if (!cancelled) setStatus("error");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  async function handleSubscribe() {
    if (!publicKey) return;
    setError(null);
    setBusy(true);
    let newSubscription: PushSubscription | null = null;
    try {
      const applicationServerKey = urlBase64ToUint8Array(publicKey);
      // Keep the permission prompt in the click handler, after checking setup.
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "unsubscribed");
        if (permission === "default") setError(t("permissionDismissed"));
        return;
      }
      const registration = await getReadyRegistration();
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        }));
      if (!existing) newSubscription = subscription;
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });
      if (!response.ok) throw new Error("Could not save subscription");
      setStatus("subscribed");
    } catch {
      // Do not leave a newly-created browser subscription looking enabled if
      // saving its server record failed. Existing subscriptions are untouched.
      await newSubscription?.unsubscribe().catch(() => {});
      setError(t("subscribeFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleUnsubscribe() {
    setError(null);
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        const response = await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        if (!response.ok) throw new Error("Could not remove subscription");
        await subscription.unsubscribe();
      }
      setStatus("unsubscribed");
    } catch {
      setError(t("unsubscribeFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{t("explanation")}</p>
      {!publicKey && (
        <p
          id={unavailableId}
          role="status"
          className="text-sm text-muted-foreground"
        >
          {t("notConfigured")}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {status === "loading" && (
        <p role="status" className="text-sm text-muted-foreground">
          {t("checking")}
        </p>
      )}
      {status === "unsupported" && (
        <p className="text-sm text-muted-foreground">{t("unsupported")}</p>
      )}
      {status === "denied" && (
        <p className="text-sm text-muted-foreground">{t("denied")}</p>
      )}
      {status === "error" && (
        <>
          <p role="alert" className="text-sm text-destructive">
            {t("statusFailed")}
          </p>
          <Button
            type="button"
            variant="outline"
            className="w-fit"
            onClick={() => {
              setStatus("loading");
              setAttempt((value) => value + 1);
            }}
          >
            {t("retry")}
          </Button>
        </>
      )}
      {status === "subscribed" && (
        <>
          <p className="text-sm text-muted-foreground">
            {publicKey ? t("enabled") : t("savedSubscription")}
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={handleUnsubscribe}
            className="w-fit"
          >
            {busy ? t("disabling") : t("disable")}
          </Button>
        </>
      )}
      {status === "unsubscribed" && (
        <Button
          type="button"
          disabled={busy || !publicKey}
          aria-describedby={!publicKey ? unavailableId : undefined}
          onClick={handleSubscribe}
          className="w-fit"
        >
          {busy ? t("enabling") : t("enable")}
        </Button>
      )}
    </div>
  );
}
