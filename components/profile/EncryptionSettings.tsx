"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => onSessionChange(() => setUnlocked(getSessionDEK() !== null)), []);

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (passphrase.length < 8) {
      setError("Passphrase must be at least 8 characters.");
      return;
    }
    if (passphrase !== confirmPassphrase) {
      setError("Passphrases don't match.");
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
      setError("Encryption isn't set up yet.");
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
      setError("Wrong passphrase.");
    } finally {
      setBusy(false);
    }
  }

  if (recoveryCode) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <p className="text-sm font-medium">Save your recovery code</p>
        <p className="text-sm text-muted-foreground">
          If you forget your passphrase, this is the only other way to recover encrypted plot
          data. Landly cannot reset it for you.
        </p>
        <code className="rounded bg-muted px-3 py-2 text-sm tracking-wider">{recoveryCode}</code>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={recoverySaved}
            onChange={(e) => setRecoverySaved(e.target.checked)}
          />
          I&apos;ve saved this somewhere safe
        </label>
        <Button
          type="button"
          disabled={!recoverySaved}
          onClick={() => setRecoveryCode(null)}
          className="w-fit"
        >
          Done
        </Button>
      </div>
    );
  }

  if (enabled && unlocked) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Unlocked for this session. Sensitive plot fields (mutation number, prices, dates,
            notes, village) are encrypted before leaving your device.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={lockSession}>
            Lock
          </Button>
        </div>
        <MigratePlotsToEncrypted userId={userId} />
      </div>
    );
  }

  if (enabled && !unlocked) {
    return (
      <form onSubmit={handleUnlock} className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Encryption is enabled but locked for this session. Enter your passphrase to view or
          edit sensitive plot fields.
        </p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="unlockPassphrase">Passphrase</Label>
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
          {busy ? "Unlocking..." : "Unlock"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSetup} className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Encrypt sensitive plot fields (mutation number, purchase price, dates, notes, village)
        client-side, so only you can read them — not even Landly. Boundary/map data stays
        unencrypted (needed for area calculation and map rendering). This passphrase is separate
        from your login password, and lost passphrase + lost recovery code means that data is
        gone for good.
      </p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="newPassphrase">Encryption passphrase</Label>
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
        <Label htmlFor="confirmNewPassphrase">Confirm passphrase</Label>
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
        {busy ? "Setting up..." : "Enable encryption"}
      </Button>
    </form>
  );
}
