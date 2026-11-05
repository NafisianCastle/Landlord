import { createClient as createSupabaseClient, type User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

// Self-service data export and account deletion, shared by the web server
// actions (app/actions/account.ts) and the /api/account routes the mobile app
// calls. Callers must pass a user they have already verified.

/** Tables holding the user's own rows, and the column that names the owner. */
const OWNED_TABLES = [
  ["profiles", "id"],
  ["land_plots", "user_id"],
  ["plot_boundary_points", "user_id"],
  ["plot_documents", "user_id"],
  ["plot_collaborators", "invited_by"],
  ["plot_audit_log", "owner_user_id"],
  ["apartments", "user_id"],
  ["apartment_documents", "user_id"],
  ["apartment_collaborators", "invited_by"],
  ["apartment_audit_log", "owner_user_id"],
  ["leases", "user_id"],
  ["lease_payments", "user_id"],
  ["expenses", "user_id"],
  ["vendors", "user_id"],
  ["maintenance_requests", "user_id"],
  ["apartment_tenants", "owner_id"],
  ["apartment_bills", "owner_id"],
  ["apartment_bill_proofs", "user_id"],
  ["tenant_portal_links", "owner_id"],
  ["subscriptions", "user_id"],
  ["payment_transactions", "user_id"],
] as const;

/** Builds a JSON export of everything the user owns. Encrypted fields stay encrypted. */
export async function exportAccountData(user: Pick<User, "id" | "email">) {
  const admin = createAdminClient();
  const tables: Record<string, unknown[]> = {};
  for (const [table, column] of OWNED_TABLES) {
    const { data, error } = await admin.from(table).select("*").eq(column, user.id);
    if (error) throw new Error(`export ${table}: ${error.message}`);
    tables[table] = data ?? [];
  }
  return {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email ?? null },
    note:
      "Fields you encrypted (sensitive_encrypted, encrypted documents) are exported as ciphertext. " +
      "Download documents from the app to keep the files themselves.",
    tables,
  };
}

/** Password accounts must re-enter their password; Google-only accounts can't. */
export function needsPassword(user: Pick<User, "app_metadata">) {
  const providers = (user.app_metadata?.providers as string[] | undefined) ?? [];
  return providers.length === 0 || providers.includes("email");
}

export type DeleteAccountError = "confirmationMismatch" | "passwordIncorrect" | "deleteFailed";

/**
 * Deletes the account after the user has typed their email and, for password
 * accounts, their password. Removes stored files first (storage isn't covered
 * by foreign keys), then the audit-log rows (no FK by design), then the auth
 * user, which cascades to every other table.
 */
export async function deleteAccount(
  user: Pick<User, "id" | "email" | "app_metadata">,
  confirmation: string,
  password: string,
): Promise<{ error?: DeleteAccountError; success?: true }> {
  const email = user.email ?? "";
  if (!email || confirmation.trim().toLowerCase() !== email.toLowerCase()) {
    return { error: "confirmationMismatch" };
  }

  if (needsPassword(user)) {
    // A throwaway client so verifying doesn't touch the caller's session.
    const verifier = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
    const { error } = await verifier.auth.signInWithPassword({ email, password });
    if (error) return { error: "passwordIncorrect" };
  }

  const admin = createAdminClient();

  const files: Record<string, string[]> = { "land-documents": [], "apartment-documents": [], "apartment-bills": [] };
  const [plotDocs, aptDocs, bills, proofs] = await Promise.all([
    admin.from("plot_documents").select("storage_path").eq("user_id", user.id),
    admin.from("apartment_documents").select("storage_path").eq("user_id", user.id),
    admin.from("apartment_bills").select("storage_path").eq("owner_id", user.id),
    admin.from("apartment_bill_proofs").select("storage_path").eq("user_id", user.id),
  ]);
  const paths = (rows: { storage_path: string | null }[] | null) =>
    (rows ?? []).map((r) => r.storage_path).filter((p): p is string => !!p);
  files["land-documents"] = paths(plotDocs.data);
  files["apartment-documents"] = paths(aptDocs.data);
  files["apartment-bills"] = [...paths(bills.data), ...paths(proofs.data)];

  for (const [bucket, list] of Object.entries(files)) {
    if (list.length === 0) continue;
    const { error } = await admin.storage.from(bucket).remove(list);
    if (error) return { error: "deleteFailed" };
  }

  for (const table of ["plot_audit_log", "apartment_audit_log"]) {
    const { error } = await admin.from(table).delete().eq("owner_user_id", user.id);
    if (error) return { error: "deleteFailed" };
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { error: "deleteFailed" };
  return { success: true };
}
