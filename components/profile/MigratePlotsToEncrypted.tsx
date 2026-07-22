"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { encryptJSON, toPgBytea } from "@/lib/crypto/encryption";
import { getSessionDEK } from "@/lib/crypto/session";
import { Button } from "@/components/ui/button";

interface PlaintextRow {
  id: string;
  village: string | null;
  mutation_number: string | null;
  purchase_price: number | null;
  purchase_date: string | null;
  current_estimated_value: number | null;
  notes: string | null;
}

function hasPlaintextData(row: PlaintextRow) {
  return (
    row.village ||
    row.mutation_number ||
    row.purchase_price !== null ||
    row.purchase_date ||
    row.current_estimated_value !== null ||
    row.notes
  );
}

export default function MigratePlotsToEncrypted({ userId }: { userId: string }) {
  const [status, setStatus] = useState<
    { state: "idle" } | { state: "running" } | { state: "done"; count: number } | { state: "error"; message: string }
  >({ state: "idle" });

  async function run() {
    const dek = getSessionDEK();
    if (!dek) return;
    setStatus({ state: "running" });

    const supabase = createClient();
    const { data, error } = await supabase
      .from("land_plots")
      .select(
        "id, village, mutation_number, purchase_price, purchase_date, current_estimated_value, notes",
      )
      .eq("user_id", userId)
      .is("sensitive_encrypted", null);

    if (error) {
      setStatus({ state: "error", message: error.message });
      return;
    }

    const rows = (data as PlaintextRow[]).filter(hasPlaintextData);
    let migrated = 0;
    for (const row of rows) {
      const { ciphertext, iv } = await encryptJSON(
        {
          village: row.village,
          mutationNumber: row.mutation_number,
          purchasePrice: row.purchase_price,
          purchaseDate: row.purchase_date,
          currentEstimatedValue: row.current_estimated_value,
          notes: row.notes,
        },
        dek,
      );
      const { error: updateError } = await supabase
        .from("land_plots")
        .update({
          sensitive_encrypted: toPgBytea(ciphertext),
          sensitive_iv: toPgBytea(iv),
          village: null,
          mutation_number: null,
          purchase_price: null,
          purchase_date: null,
          current_estimated_value: null,
          notes: null,
        })
        .eq("id", row.id);
      if (updateError) {
        setStatus({ state: "error", message: updateError.message });
        return;
      }
      migrated++;
    }

    setStatus({ state: "done", count: migrated });
  }

  if (status.state === "done") {
    return (
      <p className="text-sm text-muted-foreground">
        Encrypted {status.count} existing plot{status.count === 1 ? "" : "s"}. New plots encrypt
        automatically while unlocked.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      <p className="text-sm text-muted-foreground">
        Plots created before you enabled encryption still have plaintext sensitive fields. This
        re-saves each one encrypted and clears the plaintext copy — reversible only by unlocking
        with your passphrase or recovery code.
      </p>
      {status.state === "error" && <p className="text-sm text-destructive">{status.message}</p>}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        disabled={status.state === "running"}
        onClick={run}
      >
        {status.state === "running" ? "Encrypting..." : "Encrypt existing plots"}
      </Button>
    </div>
  );
}
