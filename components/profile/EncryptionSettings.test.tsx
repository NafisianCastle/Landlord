import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EncryptionSettings, { type EncryptionProfile } from "./EncryptionSettings";

const getSessionDEKMock = vi.fn();
const setSessionDEKMock = vi.fn();
const lockSessionMock = vi.fn();
const onSessionChangeMock = vi.fn((..._unusedArgs: unknown[]) => () => {});
const generateDEKMock = vi.fn();
const generateRecoveryCodeMock = vi.fn();
const wrapDEKWithSecretMock = vi.fn();
const unwrapDEKWithSecretMock = vi.fn();

vi.mock("@/lib/crypto/session", () => ({
  getSessionDEK: (...a: unknown[]) => getSessionDEKMock(...a),
  setSessionDEK: (...a: unknown[]) => setSessionDEKMock(...a),
  lockSession: (...a: unknown[]) => lockSessionMock(...a),
  onSessionChange: (...a: unknown[]) => onSessionChangeMock(...a),
}));
vi.mock("@/lib/crypto/encryption", () => ({
  generateDEK: (...a: unknown[]) => generateDEKMock(...a),
  generateRecoveryCode: (...a: unknown[]) => generateRecoveryCodeMock(...a),
  wrapDEKWithSecret: (...a: unknown[]) => wrapDEKWithSecretMock(...a),
  unwrapDEKWithSecret: (...a: unknown[]) => unwrapDEKWithSecretMock(...a),
  toPgBytea: (bytes: Uint8Array) => `\\x${Buffer.from(bytes).toString("hex")}`,
  fromPgBytea: (hex: string) => new Uint8Array(Buffer.from(hex.replace(/^\\x/, ""), "hex")),
}));

const updateEqMock = vi.fn();
const fromMock = vi.fn(() => ({ update: () => ({ eq: updateEqMock }) }));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ from: fromMock }),
}));
vi.mock("./MigratePlotsToEncrypted", () => ({
  default: ({ userId }: { userId: string }) => <div>Migrate for {userId}</div>,
}));

const notSetUp: EncryptionProfile = {
  encryptionEnabled: false,
  dekSalt: null,
  dekWrappedByPassphrase: null,
  dekWrappedByPassphraseIv: null,
};
const setUp: EncryptionProfile = {
  encryptionEnabled: true,
  dekSalt: "\\x01",
  dekWrappedByPassphrase: "\\x02",
  dekWrappedByPassphraseIv: "\\x03",
};

beforeEach(() => {
  vi.clearAllMocks();
  getSessionDEKMock.mockReturnValue(null);
  updateEqMock.mockResolvedValue({ error: null });
  generateDEKMock.mockResolvedValue({ fake: "dek" });
  generateRecoveryCodeMock.mockReturnValue("ABCD-EFGH-IJKL");
  wrapDEKWithSecretMock.mockResolvedValue({
    salt: new Uint8Array([1]),
    wrapped: new Uint8Array([2]),
    iv: new Uint8Array([3]),
  });
});

describe("EncryptionSettings — not set up", () => {
  it("rejects a passphrase under 8 characters", async () => {
    render(<EncryptionSettings userId="u1" profile={notSetUp} />);
    await userEvent.type(screen.getByLabelText("Encryption passphrase"), "short");
    await userEvent.type(screen.getByLabelText("Confirm passphrase"), "short");
    await userEvent.click(screen.getByRole("button", { name: "Enable encryption" }));
    expect(
      await screen.findByText("Passphrase must be at least 8 characters."),
    ).toBeInTheDocument();
    expect(generateDEKMock).not.toHaveBeenCalled();
  });

  it("rejects mismatched passphrase confirmation", async () => {
    render(<EncryptionSettings userId="u1" profile={notSetUp} />);
    await userEvent.type(screen.getByLabelText("Encryption passphrase"), "passphrase1");
    await userEvent.type(screen.getByLabelText("Confirm passphrase"), "passphrase2");
    await userEvent.click(screen.getByRole("button", { name: "Enable encryption" }));
    expect(await screen.findByText("Passphrases don't match.")).toBeInTheDocument();
  });

  it("sets up encryption, unlocks the session, and shows the recovery code once", async () => {
    render(<EncryptionSettings userId="u1" profile={notSetUp} />);
    await userEvent.type(screen.getByLabelText("Encryption passphrase"), "passphrase1");
    await userEvent.type(screen.getByLabelText("Confirm passphrase"), "passphrase1");
    await userEvent.click(screen.getByRole("button", { name: "Enable encryption" }));

    expect(await screen.findByText("Save your recovery code")).toBeInTheDocument();
    expect(screen.getByText("ABCD-EFGH-IJKL")).toBeInTheDocument();
    expect(setSessionDEKMock).toHaveBeenCalledWith({ fake: "dek" });
    // wraps the DEK twice: once by passphrase, once by recovery code
    expect(wrapDEKWithSecretMock).toHaveBeenCalledTimes(2);
  });

  it("shows the db error message when saving the wrapped keys fails", async () => {
    updateEqMock.mockResolvedValue({ error: { message: "db down" } });
    render(<EncryptionSettings userId="u1" profile={notSetUp} />);
    await userEvent.type(screen.getByLabelText("Encryption passphrase"), "passphrase1");
    await userEvent.type(screen.getByLabelText("Confirm passphrase"), "passphrase1");
    await userEvent.click(screen.getByRole("button", { name: "Enable encryption" }));
    expect(await screen.findByText("db down")).toBeInTheDocument();
    expect(setSessionDEKMock).not.toHaveBeenCalled();
  });

  it("requires the confirm dialog checkbox before Done is enabled", async () => {
    render(<EncryptionSettings userId="u1" profile={notSetUp} />);
    await userEvent.type(screen.getByLabelText("Encryption passphrase"), "passphrase1");
    await userEvent.type(screen.getByLabelText("Confirm passphrase"), "passphrase1");
    await userEvent.click(screen.getByRole("button", { name: "Enable encryption" }));
    await screen.findByText("Save your recovery code");

    const doneBtn = screen.getByRole("button", { name: "Done" });
    expect(doneBtn).toBeDisabled();
    await userEvent.click(screen.getByRole("checkbox"));
    expect(doneBtn).not.toBeDisabled();
  });
});

describe("EncryptionSettings — enabled and locked", () => {
  it("shows the unlock form", () => {
    render(<EncryptionSettings userId="u1" profile={setUp} />);
    expect(screen.getByLabelText("Passphrase")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unlock" })).toBeInTheDocument();
  });

  it("unlocks the session on the correct passphrase", async () => {
    unwrapDEKWithSecretMock.mockResolvedValue({ fake: "unwrapped-dek" });
    render(<EncryptionSettings userId="u1" profile={setUp} />);
    await userEvent.type(screen.getByLabelText("Passphrase"), "correct-passphrase");
    await userEvent.click(screen.getByRole("button", { name: "Unlock" }));
    await waitFor(() =>
      expect(setSessionDEKMock).toHaveBeenCalledWith({ fake: "unwrapped-dek" }),
    );
  });

  it("shows 'Wrong passphrase.' when unwrapping fails", async () => {
    unwrapDEKWithSecretMock.mockRejectedValue(new Error("bad tag"));
    render(<EncryptionSettings userId="u1" profile={setUp} />);
    await userEvent.type(screen.getByLabelText("Passphrase"), "wrong-passphrase");
    await userEvent.click(screen.getByRole("button", { name: "Unlock" }));
    expect(await screen.findByText("Wrong passphrase.")).toBeInTheDocument();
  });
});

describe("EncryptionSettings — enabled and unlocked", () => {
  it("shows the unlocked state, a lock button, and the migration panel", async () => {
    getSessionDEKMock.mockReturnValue({ fake: "dek" });
    render(<EncryptionSettings userId="u1" profile={setUp} />);
    expect(screen.getByText(/Unlocked for this session/)).toBeInTheDocument();
    expect(screen.getByText("Migrate for u1")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Lock" }));
    expect(lockSessionMock).toHaveBeenCalled();
  });
});
