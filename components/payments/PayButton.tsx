"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function PayButton() {
  const [submitting, setSubmitting] = useState(false);

  return (
    <Button
      type="submit"
      className="w-full"
      disabled={submitting}
      onClick={() => setSubmitting(true)}
    >
      {submitting ? "Redirecting to payment..." : "Pay with bKash / card / bank"}
    </Button>
  );
}
