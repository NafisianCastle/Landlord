import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MigratePlotsToEncrypted from "./MigratePlotsToEncrypted";

const getSessionDEKMock = vi.fn();
const encryptJSONMock = vi.fn();
const selectResult: { data?: unknown; error?: unknown } = { data: [], error: null };
let selectReturn = selectResult;
function makeChain() {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.is = vi.fn(async () => selectReturn);
  chain.update = vi.fn(() => updateChain);
  return chain;
}
const updateChain = { eq: vi.fn(async (): Promise<{ error: unknown }> => ({ error: null })) };

const fromMock = vi.fn(() => makeChain());
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ from: fromMock }),
}));
vi.mock("@/lib/crypto/encryption", () => ({
  encryptJSON: (...a: unknown[]) => encryptJSONMock(...a),
  toPgBytea: (bytes: Uint8Array) => `\\x${Buffer.from(bytes).toString("hex")}`,
}));
vi.mock("@/lib/crypto/session", () => ({
  getSessionDEK: (...a: unknown[]) => getSessionDEKMock(...a),
}));

beforeEach(() => {
  vi.clearAllMocks();
  getSessionDEKMock.mockReturnValue({ fake: "dek" });
  encryptJSONMock.mockResolvedValue({
    ciphertext: new Uint8Array([1]),
    iv: new Uint8Array([2]),
  });
  selectReturn = { data: [], error: null };
  updateChain.eq.mockResolvedValue({ error: null });
});

describe("MigratePlotsToEncrypted", () => {
  it("does nothing if there is no unlocked session DEK", async () => {
    getSessionDEKMock.mockReturnValue(null);
    render(<MigratePlotsToEncrypted userId="u1" />);
    await userEvent.click(screen.getByRole("button", { name: "Encrypt existing plots" }));
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("does nothing if the confirm dialog is declined", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<MigratePlotsToEncrypted userId="u1" />);
    await userEvent.click(screen.getByRole("button", { name: "Encrypt existing plots" }));
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("shows the fetch error when the select query fails", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    selectReturn = { data: null, error: { message: "fetch failed" } };
    render(<MigratePlotsToEncrypted userId="u1" />);
    await userEvent.click(screen.getByRole("button", { name: "Encrypt existing plots" }));
    expect(await screen.findByText("fetch failed")).toBeInTheDocument();
  });

  it("skips rows with no plaintext sensitive data and reports 0 migrated", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    selectReturn = {
      data: [
        {
          id: "p1",
          village: null,
          mutation_number: null,
          purchase_price: null,
          purchase_date: null,
          current_estimated_value: null,
          notes: null,
        },
      ],
      error: null,
    };
    render(<MigratePlotsToEncrypted userId="u1" />);
    await userEvent.click(screen.getByRole("button", { name: "Encrypt existing plots" }));
    expect(await screen.findByText(/Encrypted 0 existing plots/)).toBeInTheDocument();
    expect(encryptJSONMock).not.toHaveBeenCalled();
  });

  it("migrates rows with plaintext data and reports the singular count correctly", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    selectReturn = {
      data: [
        {
          id: "p1",
          village: "V",
          mutation_number: null,
          purchase_price: null,
          purchase_date: null,
          current_estimated_value: null,
          notes: null,
        },
      ],
      error: null,
    };
    render(<MigratePlotsToEncrypted userId="u1" />);
    await userEvent.click(screen.getByRole("button", { name: "Encrypt existing plots" }));
    expect(await screen.findByText(/Encrypted 1 existing plot\./)).toBeInTheDocument();
    expect(encryptJSONMock).toHaveBeenCalled();
  });

  it("stops and reports the error if an update fails partway through", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    selectReturn = {
      data: [
        {
          id: "p1",
          village: "V",
          mutation_number: null,
          purchase_price: null,
          purchase_date: null,
          current_estimated_value: null,
          notes: null,
        },
      ],
      error: null,
    };
    updateChain.eq.mockResolvedValue({ error: { message: "update failed" } });
    render(<MigratePlotsToEncrypted userId="u1" />);
    await userEvent.click(screen.getByRole("button", { name: "Encrypt existing plots" }));
    expect(await screen.findByText("update failed")).toBeInTheDocument();
  });
});
