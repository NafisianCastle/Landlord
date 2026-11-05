import { createClient } from "@/lib/supabase/server";
import { UUID } from "@/lib/validation/forms";

/** Authenticated proxy checks current RLS on every request, including after revocation. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return new Response(null, { status: 404 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(null, { status: 401 });
  const proof = new URL(request.url).searchParams.get("kind") === "proof";
  const { data: row } = await supabase.from(proof ? "apartment_bill_proofs" : "apartment_bills")
    .select("storage_path, file_name").eq("id", id).single();
  if (!row?.storage_path) return new Response(null, { status: 404 });
  const { data, error } = await supabase.storage.from("apartment-bills").download(row.storage_path);
  if (!data || error) return new Response(null, { status: 404 });
  return new Response(data, { headers: {
    "Content-Type": data.type,
    "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(row.file_name ?? "attachment")}`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "sandbox; default-src 'none'",
  } });
}
