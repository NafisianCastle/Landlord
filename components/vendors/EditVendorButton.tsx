"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { updateVendor } from "@/app/actions/vendors";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import VendorForm from "@/components/vendors/VendorForm";
import type { VendorRow } from "@/components/vendors/VendorsList";

export default function EditVendorButton({ vendor }: { vendor: VendorRow }) {
  const t = useTranslations("VendorsList");
  const [open, setOpen] = useState(false);

  async function save(prevState: unknown, formData: FormData) {
    const result = await updateVendor(vendor.id, prevState, formData);
    if (result?.success) setOpen(false);
    return result;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm">
          {t("edit")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("editVendor")}</DialogTitle>
        </DialogHeader>
        <VendorForm action={save} initial={vendor} submitLabel={t("saveChanges")} />
      </DialogContent>
    </Dialog>
  );
}
