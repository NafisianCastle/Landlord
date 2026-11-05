import { afterEach, describe, expect, it } from "vitest";
import { act, screen } from "@testing-library/react";
import { renderWithIntl as render } from "@/test/i18n";
import { encryptJSON, generateDEK, toPgBytea } from "@/lib/crypto/encryption";
import { lockSession, setSessionDEK } from "@/lib/crypto/session";
import TenantName from "./TenantName";

afterEach(() => lockSession());

describe("TenantName", () => {
  it("shows plaintext names as-is", () => {
    render(<TenantName lease={{ tenant_name: "Rahim" }} />);
    expect(screen.getByText("Rahim")).toBeInTheDocument();
  });

  it("hides an encrypted name until the session unlocks, then decrypts it", async () => {
    const dek = await generateDEK();
    const { ciphertext, iv } = await encryptJSON(
      { tenantName: "Karim", tenantPhone: null, tenantEmail: null, notes: null },
      dek,
    );
    render(<TenantName lease={{ tenant_name: null, sensitive_encrypted: toPgBytea(ciphertext), sensitive_iv: toPgBytea(iv) }} />);
    expect(screen.getByText("🔒 Encrypted tenant")).toBeInTheDocument();
    expect(screen.queryByText("Karim")).not.toBeInTheDocument();

    act(() => setSessionDEK(dek));
    expect(await screen.findByText("Karim")).toBeInTheDocument();
  });
});
