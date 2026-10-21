import { Suspense } from "react";
import SectionLoading from "@/components/system/SectionLoading";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { updateApartmentMetadata } from "@/app/actions/apartments";
import { Card, CardContent } from "@/components/ui/card";
import ApartmentMetadataForm from "@/components/apartments/ApartmentMetadataForm";
import ApartmentDocumentUploader from "@/components/apartment-documents/ApartmentDocumentUploader";
import ApartmentDocumentRow from "@/components/apartment-documents/ApartmentDocumentRow";
import DeleteApartmentButton from "@/components/apartments/DeleteApartmentButton";
import GuestApartmentDetail from "@/components/apartments/GuestApartmentDetail";
import ApartmentCollaborators from "@/components/apartments/ApartmentCollaborators";
import ApartmentAuditLog from "@/components/apartments/ApartmentAuditLog";
import LeaseSection from "@/components/leases/LeaseSection";
import MaintenanceSection from "@/components/maintenance/MaintenanceSection";
import ExpenseSection from "@/components/expenses/ExpenseSection";
import ApartmentBillSection from "@/components/bills/ApartmentBillSection";

export default async function ApartmentDetailPage({
  params,
}: {
  params: Promise<{ apartmentId: string }>;
}) {
  const { apartmentId } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return <GuestApartmentDetail apartmentId={apartmentId} />;
  }

  const [{ data: apartment, error }, { data: documents }, { data: collaborators }] =
    await Promise.all([
      supabase.from("apartments").select("*").eq("id", apartmentId).single(),
      supabase
        .from("apartment_documents")
        .select("id, file_name, storage_path, is_encrypted, encryption_iv")
        .eq("apartment_id", apartmentId)
        .order("uploaded_at", { ascending: false }),
      supabase
        .from("apartment_collaborators")
        .select("id, invited_email, role")
        .eq("apartment_id", apartmentId)
        .order("created_at", { ascending: true }),
    ]);

  const t = await getTranslations("ApartmentDetailPage");

  if (error && error.code !== "PGRST116") {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
        <p className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {t("loadError", { message: error.message })}
        </p>
      </div>
    );
  }

  if (!apartment) notFound();
  const { data: tenants } = apartment.user_id === user.id
    ? await supabase.from("apartment_tenants").select("id, invited_email").eq("apartment_id", apartment.id)
    : { data: [] };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">{apartment.name}</h1>
      </div>

      {apartment.size && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              {t("sizeValue", { value: apartment.size, unit: apartment.size_unit ?? "" })}
            </p>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="mb-2 font-medium">{t("details")}</h2>
        <Card>
          <CardContent className="pt-6">
            <ApartmentMetadataForm
              action={updateApartmentMetadata.bind(null, apartment.id)}
              initial={{
                name: apartment.name,
                upazila: apartment.upazila,
                district: apartment.district,
                division: apartment.division,
                floor: apartment.floor,
                size: apartment.size,
                sizeUnit: apartment.size_unit,
                sensitiveEncryptedHex: apartment.sensitive_encrypted,
                sensitiveIvHex: apartment.sensitive_iv,
                plaintext: {
                  buildingName: apartment.building_name,
                  unitNumber: apartment.unit_number,
                  purchasePrice: apartment.purchase_price,
                  purchaseDate: apartment.purchase_date,
                  currentEstimatedValue: apartment.current_estimated_value,
                  notes: apartment.notes,
                },
              }}
              submitLabel={t("saveChanges")}
            />
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-2 font-medium">{t("documents")}</h2>
        <ul className="mb-3 divide-y divide-border rounded-lg border border-border px-3 py-1">
          {(documents ?? []).map((doc) => (
            <ApartmentDocumentRow
              key={doc.id}
              apartmentId={apartment.id}
              documentId={doc.id}
              storagePath={doc.storage_path}
              fileName={doc.file_name}
              isEncrypted={doc.is_encrypted}
              encryptionIvHex={doc.encryption_iv}
            />
          ))}
          {(!documents || documents.length === 0) && (
            <li className="py-2 text-sm text-muted-foreground">{t("noDocumentsYet")}</li>
          )}
        </ul>
        <ApartmentDocumentUploader apartmentId={apartment.id} />
      </div>

      <ApartmentCollaborators
        apartmentId={apartment.id}
        isOwner={apartment.user_id === user.id}
        collaborators={collaborators ?? []}
        tenants={(tenants ?? []).map(tenant => ({ ...tenant, role: "tenant" }))}
      />

      <Suspense fallback={<SectionLoading />}>
        <ApartmentAuditLog apartmentId={apartment.id} isOwner={apartment.user_id === user.id} />
      </Suspense>

      {apartment.user_id === user.id && (
        <Suspense fallback={<SectionLoading />}>
          <LeaseSection subjectType="apartment" subjectId={apartment.id} />
        </Suspense>
      )}

      {apartment.user_id === user.id && (
        <Suspense fallback={<SectionLoading />}>
          <MaintenanceSection subjectType="apartment" subjectId={apartment.id} />
        </Suspense>
      )}

      {apartment.user_id === user.id && (
        <Suspense fallback={<SectionLoading />}>
          <ApartmentBillSection apartmentId={apartment.id} />
        </Suspense>
      )}

      {apartment.user_id === user.id && (
        <Suspense fallback={<SectionLoading />}>
          <ExpenseSection subjectType="apartment" subjectId={apartment.id} />
        </Suspense>
      )}

      {apartment.user_id === user.id && (
        <DeleteApartmentButton apartmentId={apartment.id} apartmentName={apartment.name} />
      )}
    </div>
  );
}
