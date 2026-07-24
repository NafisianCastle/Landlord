import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl as render } from "@/test/i18n";
import PlotMetadataForm from "./PlotMetadataForm";

const getSessionDEKMock = vi.fn();
const onSessionChangeMock = vi.fn((..._unusedArgs: unknown[]) => () => {});
const encryptJSONMock = vi.fn();
const decryptJSONMock = vi.fn();

vi.mock("@/lib/crypto/session", () => ({
  getSessionDEK: (...args: unknown[]) => getSessionDEKMock(...args),
  onSessionChange: (...args: unknown[]) => onSessionChangeMock(...args),
}));

vi.mock("@/lib/crypto/encryption", () => ({
  encryptJSON: (...args: unknown[]) => encryptJSONMock(...args),
  decryptJSON: (...args: unknown[]) => decryptJSONMock(...args),
  toPgBytea: (bytes: Uint8Array) => `\\x${Buffer.from(bytes).toString("hex")}`,
  fromPgBytea: (hex: string) => new Uint8Array(Buffer.from(hex.replace(/^\\x/, ""), "hex")),
}));

beforeEach(() => {
  vi.clearAllMocks();
  getSessionDEKMock.mockReturnValue(null);
  onSessionChangeMock.mockReturnValue(() => {});
});

describe("PlotMetadataForm — plaintext, unencrypted record, no session", () => {
  it("renders initial values and the plot name field is required", () => {
    render(
      <PlotMetadataForm
        action={vi.fn()}
        submitLabel="Save"
        initial={{ name: "My Plot", upazila: "U", district: "D", division: "Div" }}
      />,
    );
    expect(screen.getByLabelText("Plot name")).toHaveValue("My Plot");
    expect(screen.getByLabelText("Plot name")).toBeRequired();
    expect(screen.getByLabelText("Upazila")).toHaveValue("U");
  });

  it("submits the form normally (no interception) when no session DEK is unlocked", async () => {
    const action = vi.fn(async () => undefined);
    render(<PlotMetadataForm action={action} submitLabel="Save" />);
    await userEvent.type(screen.getByLabelText("Plot name"), "New Plot");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(action).toHaveBeenCalled());
    expect(encryptJSONMock).not.toHaveBeenCalled();
  });

  it("renders the area unit selects with 'decimal' as the default", () => {
    render(<PlotMetadataForm action={vi.fn()} submitLabel="Save" />);
    const selects = screen.getAllByRole("combobox");
    expect(selects).toHaveLength(2);
    for (const select of selects) {
      expect(select).toHaveValue("decimal");
    }
  });

  it("updates each sensitive field as the user types", async () => {
    render(<PlotMetadataForm action={vi.fn()} submitLabel="Save" />);
    await userEvent.type(screen.getByLabelText("Village"), "My Village");
    expect(screen.getByLabelText("Village")).toHaveValue("My Village");

    await userEvent.type(screen.getByLabelText("Mutation number"), "M-42");
    expect(screen.getByLabelText("Mutation number")).toHaveValue("M-42");

    await userEvent.type(screen.getByLabelText("Purchase price (BDT)"), "5000");
    expect(screen.getByLabelText("Purchase price (BDT)")).toHaveValue(5000);

    await userEvent.type(screen.getByLabelText("Purchase date"), "2026-01-15");
    expect(screen.getByLabelText("Purchase date")).toHaveValue("2026-01-15");

    await userEvent.type(screen.getByLabelText("Current estimated value (BDT)"), "6000");
    expect(screen.getByLabelText("Current estimated value (BDT)")).toHaveValue(6000);

    await userEvent.type(screen.getByLabelText("Notes"), "Some notes");
    expect(screen.getByLabelText("Notes")).toHaveValue("Some notes");
  });

  it("clears purchasePrice/currentEstimatedValue back to null when the field is emptied", async () => {
    render(<PlotMetadataForm action={vi.fn()} submitLabel="Save" />);
    const priceInput = screen.getByLabelText("Purchase price (BDT)");
    await userEvent.type(priceInput, "100");
    await userEvent.clear(priceInput);
    expect(priceInput).toHaveValue(null);
  });

  it("shows the server action's error message", async () => {
    const action = vi.fn(async () => ({ error: "Something went wrong" }));
    render(<PlotMetadataForm action={action} submitLabel="Save" />);
    await userEvent.type(screen.getByLabelText("Plot name"), "New Plot");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Something went wrong")).toBeInTheDocument();
  });
});

describe("PlotMetadataForm — session unlocked, plaintext record", () => {
  it("intercepts submit, encrypts sensitive fields, and strips plaintext ones", async () => {
    getSessionDEKMock.mockReturnValue({ fake: "dek" });
    encryptJSONMock.mockResolvedValue({
      ciphertext: new Uint8Array([1, 2, 3]),
      iv: new Uint8Array([4, 5]),
    });
    let submittedFormData: FormData | undefined;
    const action = vi.fn(async (_prev: unknown, fd: FormData) => {
      submittedFormData = fd;
      return undefined;
    });

    render(
      <PlotMetadataForm
        action={action}
        submitLabel="Save"
        initial={{ name: "Plot", plaintext: { village: "V", mutationNumber: null, purchasePrice: null, purchaseDate: null, currentEstimatedValue: null, notes: null } }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(action).toHaveBeenCalled());
    expect(encryptJSONMock).toHaveBeenCalled();
    expect(submittedFormData?.get("sensitiveEncryptedHex")).toBe("\\x010203");
    expect(submittedFormData?.get("sensitiveIvHex")).toBe("\\x0405");
    expect(submittedFormData?.has("village")).toBe(false);
    expect(submittedFormData?.has("mutationNumber")).toBe(false);
    expect(submittedFormData?.has("notes")).toBe(false);
  });

  it("shows the 'will be saved encrypted' notice once unlocked", () => {
    getSessionDEKMock.mockReturnValue({ fake: "dek" });
    render(<PlotMetadataForm action={vi.fn()} submitLabel="Save" />);
    expect(
      screen.getByText(/will be saved encrypted/i),
    ).toBeInTheDocument();
  });
});

describe("PlotMetadataForm — encrypted record", () => {
  const encryptedInitial = {
    name: "Plot",
    sensitiveEncryptedHex: "\\x01",
    sensitiveIvHex: "\\x02",
  };

  it("locks sensitive fields and disables the submit button when session is locked", () => {
    getSessionDEKMock.mockReturnValue(null);
    render(<PlotMetadataForm action={vi.fn()} submitLabel="Save" initial={encryptedInitial} />);
    expect(screen.getByLabelText("Village")).toBeDisabled();
    expect(screen.getByLabelText("Mutation number")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(screen.getByText(/encrypted. Unlock encryption in/i)).toBeInTheDocument();
  });

  it("decrypts and populates sensitive fields once the session is unlocked", async () => {
    getSessionDEKMock.mockReturnValue({ fake: "dek" });
    decryptJSONMock.mockResolvedValue({
      village: "Decrypted Village",
      mutationNumber: "M-1",
      purchasePrice: 5000,
      purchaseDate: "2026-01-01",
      currentEstimatedValue: 6000,
      notes: "Some notes",
    });
    render(<PlotMetadataForm action={vi.fn()} submitLabel="Save" initial={encryptedInitial} />);

    await waitFor(() =>
      expect(screen.getByLabelText("Village")).toHaveValue("Decrypted Village"),
    );
    expect(screen.getByLabelText("Mutation number")).toHaveValue("M-1");
    expect(screen.getByLabelText("Village")).not.toBeDisabled();
  });

  it("shows a decrypt error when the session key cannot decrypt the stored blob", async () => {
    getSessionDEKMock.mockReturnValue({ fake: "wrong-dek" });
    decryptJSONMock.mockRejectedValue(new Error("bad tag"));
    render(<PlotMetadataForm action={vi.fn()} submitLabel="Save" initial={encryptedInitial} />);

    expect(
      await screen.findByText("Couldn't decrypt with the current session key."),
    ).toBeInTheDocument();
  });
});
