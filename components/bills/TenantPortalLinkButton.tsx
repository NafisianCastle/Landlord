"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { createTenantPortalLink, revokeTenantPortalLink } from "@/app/actions/tenantPortal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function TenantPortalLinkButton({ tenantShareId }: { tenantShareId: string }) {
  const t = useTranslations("TenantPortalLink");
  const [pending, startTransition] = useTransition();
  const [url, setUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function copyToClipboard(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(t("copied"));
    } catch {
      setMessage(t("failed"));
    }
  }

  function create() {
    setMessage(null);
    startTransition(async () => {
      const result = await createTenantPortalLink(tenantShareId);
      if (!("url" in result)) return setMessage(result.error ?? t("failed"));
      const createdUrl = result.url;
      setUrl(createdUrl);
      if (navigator.share) {
        await navigator.share({ title: t("shareTitle"), text: t("shareText"), url: createdUrl })
          .catch(() => undefined);
      } else {
        await copyToClipboard(createdUrl);
      }
    });
  }

  function copy() {
    if (!url) return;
    void copyToClipboard(url);
  }

  function revoke() {
    setMessage(null);
    startTransition(async () => {
      const result = await revokeTenantPortalLink(tenantShareId);
      if (result.error) return setMessage(result.error);
      setUrl(null);
      setMessage(t("revoked"));
    });
  }

  return <div className="flex min-w-0 flex-col gap-2">
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" variant="outline" disabled={pending} onClick={create}>
        {pending ? t("working") : t("shareLink")}
      </Button>
      {url && <Button type="button" size="sm" variant="ghost" onClick={copy}>{t("copy")}</Button>}
      {url && <Button type="button" size="sm" variant="ghost" onClick={revoke}>{t("revoke")}</Button>}
    </div>
    {url && <Input readOnly value={url} aria-label={t("linkLabel")} className="min-w-0 text-xs" />}
    {message && <p role="status" className="text-xs text-muted-foreground">{message}</p>}
  </div>;
}
