"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import {
  generateDEK,
  generateRecoveryCode,
  wrapDEKWithSecret,
  unwrapDEKWithSecret,
  toPgBytea,
  fromPgBytea,
} from "@/lib/crypto/encryption";
import { getSessionDEK, setSessionDEK, lockSession, onSessionChange } from "@/lib/crypto/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import MigratePlotsToEncrypted from "./MigratePlotsToEncrypted";

export interface EncryptionProfile {
  encryptionEnabled: boolean;
  dekSalt: string | null;
  dekWrappedByPassphrase: string | null;
  dekWrappedByPassphraseIv: string | null;
}

export default function EncryptionSettings({
  userId,
  profile,
}: {
  userId: string;
  profile: EncryptionProfile;
}) {
  const [unlocked, setUnlocked] = useState(() => getSessionDEK() !== null);
  const [enabled, setEnabled] = useState(profile.encryptionEnabled);
  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [recoverySaved, setRecoverySaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const t = useTranslations("EncryptionSettings");

  useEffect(() => onSessionChange(() => setUnlocked(getSessionDEK() !== null)), []);

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (passphrase.length < 8) {
      setError(t("passphraseTooShort"));
      return;
    }
    if (passphrase !== confirmPassphrase) {
      setError(t("passphraseMismatch"));
      return;
    }
    setBusy(true);
    try {
      const dek = await generateDEK();
      const code = generateRecoveryCode();
      const byPassphrase = await wrapDEKWithSecret(dek, passphrase);
      const byRecovery = await wrapDEKWithSecret(dek, code);

      const supabase = createClient();
      const { error: dbError } = await supabase
        .from("profiles")
        .update({
          encryption_enabled: true,
          dek_salt: toPgBytea(byPassphrase.salt),
          dek_wrapped_by_passphrase: toPgBytea(byPassphrase.wrapped),
          dek_wrapped_by_passphrase_iv: toPgBytea(byPassphrase.iv),
          recovery_salt: toPgBytea(byRecovery.salt),
          dek_wrapped_by_recovery: toPgBytea(byRecovery.wrapped),
          dek_wrapped_by_recovery_iv: toPgBytea(byRecovery.iv),
        })
        .eq("id", userId);

      if (dbError) {
        setError(dbError.message);
        return;
      }

      setSessionDEK(dek);
      setEnabled(true);
      setRecoveryCode(code);
      setPassphrase("");
      setConfirmPassphrase("");
    } finally {
      setBusy(false);
    }
  }

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!profile.dekSalt || !profile.dekWrappedByPassphrase || !profile.dekWrappedByPassphraseIv) {
      setError(t("notSetUp"));
      return;
    }
    setBusy(true);
    try {
      const dek = await unwrapDEKWithSecret(
        passphrase,
        fromPgBytea(profile.dekSalt),
        fromPgBytea(profile.dekWrappedByPassphrase),
        fromPgBytea(profile.dekWrappedByPassphraseIv),
      );
      setSessionDEK(dek);
      setPassphrase("");
    } catch {
      setError(t("wrongPassphrase"));
    } finally {
      setBusy(false);
    }
  }

  if (recoveryCode) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <p className="text-sm font-medium">{t("saveRecoveryCode")}</p>
        <p className="text-sm text-muted-foreground">{t("recoveryCodeHint")}</p>
        <code className="rounded bg-muted px-3 py-2 text-sm tracking-wider">{recoveryCode}</code>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={recoverySaved}
            onChange={(e) => setRecoverySaved(e.target.checked)}
          />
          {t("savedSomewhereSafe")}
        </label>
        <Button
          type="button"
          disabled={!recoverySaved}
          onClick={() => setRecoveryCode(null)}
          className="w-fit"
        >
          {t("done")}
        </Button>
      </div>
    );
  }

  if (enabled && unlocked) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{t("unlockedForSession")}</p>
          <Button type="button" variant="outline" size="sm" onClick={lockSession}>
            {t("lock")}
          </Button>
        </div>
        <MigratePlotsToEncrypted userId={userId} />
      </div>
    );
  }

  if (enabled && !unlocked) {
    return (
      <form onSubmit={handleUnlock} className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{t("lockedForSession")}</p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="unlockPassphrase">{t("passphrase")}</Label>
          <Input
            id="unlockPassphrase"
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={busy} className="w-fit">
          {busy ? t("unlocking") : t("unlock")}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSetup} className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{t("setupExplanation")}</p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="newPassphrase">{t("encryptionPassphrase")}</Label>
        <Input
          id="newPassphrase"
          type="password"
          minLength={8}
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirmNewPassphrase">{t("confirmPassphrase")}</Label>
        <Input
          id="confirmNewPassphrase"
          type="password"
          minLength={8}
          value={confirmPassphrase}
          onChange={(e) => setConfirmPassphrase(e.target.value)}
          required
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={busy} className="w-fit">
        {busy ? t("settingUp") : t("enableEncryption")}
      </Button>
    </form>
  );
}
