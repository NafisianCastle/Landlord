import { getTenantPortalBillFile } from "@/lib/tenantPortal";

export async function GET(_request: Request, { params }: {
  params: Promise<{ token: string; id: string }>;
}) {
  const { token, id } = await params;
  const file = await getTenantPortalBillFile(token, id);
  if (!file) return new Response(null, { status: 404 });
  return new Response(file.data, { headers: {
    "Content-Type": file.data.type,
    "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
    "Cache-Control": "private, no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "sandbox; default-src 'none'",
  } });
}
