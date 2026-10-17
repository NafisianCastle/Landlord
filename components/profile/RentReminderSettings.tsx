"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

type Status = "unsupported" | "denied" | "unsubscribed" | "subscribed";

async function getInitialStatus(): Promise<Status> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const registration = await navigator.serviceWorker.ready;
  const sub = await registration.pushManager.getSubscription();
  return sub ? "subscribed" : "unsubscribed";
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export default function RentReminderSettings() {
  const t = useTranslations("RentReminderSettings");
  const [status, setStatus] = useState<Status>("unsubscribed");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getInitialStatus().then(setStatus);
  }, []);

  async function handleSubscribe() {
    setError(null);
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        setError(t("notConfigured"));
        return;
      }
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus("subscribed");
    } catch {
      setError(t("subscribeFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleUnsubscribe() {
    setError(null);
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setStatus("unsubscribed");
    } catch {
      setError(t("unsubscribeFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (status === "unsupported") {
    return <p className="text-sm text-muted-foreground">{t("unsupported")}</p>;
  }

  if (status === "denied") {
    return <p className="text-sm text-muted-foreground">{t("denied")}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{t("explanation")}</p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {status === "subscribed" ? (
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={handleUnsubscribe}
          className="w-fit"
        >
          {busy ? t("disabling") : t("disable")}
        </Button>
      ) : (
        <Button type="button" disabled={busy} onClick={handleSubscribe} className="w-fit">
          {busy ? t("enabling") : t("enable")}
        </Button>
      )}
    </div>
  );
}
