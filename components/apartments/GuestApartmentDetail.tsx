"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  getGuestApartment,
  updateGuestApartmentMetadata,
  deleteGuestApartment,
  type GuestApartment,
} from "@/lib/offline/guestApartments";
import { Card, CardContent } from "@/components/ui/card";
import ApartmentMetadataForm from "@/components/apartments/ApartmentMetadataForm";
import DeleteApartmentButton from "@/components/apartments/DeleteApartmentButton";

export default function GuestApartmentDetail({ apartmentId }: { apartmentId: string }) {
  const router = useRouter();
  const t = useTranslations("ApartmentDetailPage");
  const tGuest = useTranslations("GuestMode");
  const tApartmentActions = useTranslations("ApartmentActions");
  const [apartment, setApartment] = useState<GuestApartment | null | undefined>(undefined);

  const reload = useCallback(async () => {
    const found = await getGuestApartment(apartmentId);
    setApartment(found ?? null);
  }, [apartmentId]);

  useEffect(() => {
    getGuestApartment(apartmentId).then((found) => setApartment(found ?? null));
  }, [apartmentId]);

  const handleUpdateMetadata = useCallback(
    async (_prevState: unknown, formData: FormData) => {
      const name = String(formData.get("name") ?? "").trim();
      if (!name) return { error: tApartmentActions("apartmentNameRequired") };

      await updateGuestApartmentMetadata(apartmentId, {
        name,
        upazila: String(formData.get("upazila") ?? "") || null,
        district: String(formData.get("district") ?? "") || null,
        division: String(formData.get("division") ?? "") || null,
        floor: String(formData.get("floor") ?? "") || null,
        size: formData.get("size") ? Number(formData.get("size")) : null,
        sizeUnit: String(formData.get("sizeUnit") ?? "") || null,
        buildingName: String(formData.get("buildingName") ?? "") || null,
        unitNumber: String(formData.get("unitNumber") ?? "") || null,
        purchasePrice: formData.get("purchasePrice")
          ? Number(formData.get("purchasePrice"))
          : null,
        purchaseDate: String(formData.get("purchaseDate") ?? "") || null,
        currentEstimatedValue: formData.get("currentEstimatedValue")
          ? Number(formData.get("currentEstimatedValue"))
          : null,
        notes: String(formData.get("notes") ?? "") || null,
      });
      await reload();
      return { success: true };
    },
    [apartmentId, reload, tApartmentActions],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteGuestApartment(id);
      router.push("/apartments");
    },
    [router],
  );

  if (apartment === undefined) return null;
  if (apartment === null) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
        <p className="text-sm text-muted-foreground">{tGuest("apartmentNotFound")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">{apartment.name}</h1>
      </div>

      <div>
        <h2 className="mb-2 font-medium">{t("details")}</h2>
        <Card>
          <CardContent className="pt-6">
            <ApartmentMetadataForm
              action={handleUpdateMetadata}
              initial={{
                name: apartment.name,
                upazila: apartment.upazila,
                district: apartment.district,
                division: apartment.division,
                floor: apartment.floor,
                size: apartment.size,
                sizeUnit: apartment.sizeUnit,
                plaintext: {
                  buildingName: apartment.buildingName,
                  unitNumber: apartment.unitNumber,
                  purchasePrice: apartment.purchasePrice,
                  purchaseDate: apartment.purchaseDate,
                  currentEstimatedValue: apartment.currentEstimatedValue,
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
        <p className="rounded-lg border border-border p-3 text-sm text-muted-foreground">
          {tGuest("documentsRequireSignup")}
        </p>
      </div>

      <DeleteApartmentButton
        apartmentId={apartment.id}
        apartmentName={apartment.name}
        onDelete={handleDelete}
      />
    </div>
  );
}
