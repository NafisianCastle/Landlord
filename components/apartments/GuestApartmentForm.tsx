"use client";

import { useRouter } from "next/navigation";
import { createGuestApartment } from "@/lib/offline/guestApartments";
import ApartmentMetadataForm from "@/components/apartments/ApartmentMetadataForm";

export default function GuestApartmentForm({ submitLabel }: { submitLabel: string }) {
  const router = useRouter();

  async function createGuestApartmentAction(_prevState: unknown, formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return { error: "Apartment name is required" };

    const apartment = await createGuestApartment({
      name,
      upazila: String(formData.get("upazila") ?? "") || null,
      district: String(formData.get("district") ?? "") || null,
      division: String(formData.get("division") ?? "") || null,
      floor: String(formData.get("floor") ?? "") || null,
      size: formData.get("size") ? Number(formData.get("size")) : null,
      sizeUnit: String(formData.get("sizeUnit") ?? "") || null,
      buildingName: String(formData.get("buildingName") ?? "") || null,
      unitNumber: String(formData.get("unitNumber") ?? "") || null,
      purchasePrice: formData.get("purchasePrice") ? Number(formData.get("purchasePrice")) : null,
      purchaseDate: String(formData.get("purchaseDate") ?? "") || null,
      currentEstimatedValue: formData.get("currentEstimatedValue")
        ? Number(formData.get("currentEstimatedValue"))
        : null,
      notes: String(formData.get("notes") ?? "") || null,
    });

    router.push(`/apartments/${apartment.id}`);
    return undefined;
  }

  return <ApartmentMetadataForm action={createGuestApartmentAction} submitLabel={submitLabel} />;
}
