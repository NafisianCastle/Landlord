import { describe, expect, it } from "vitest";
import {
  decryptBytes,
  decryptJSON,
  encryptBytes,
  encryptJSON,
  fromPgBytea,
  generateDEK,
  generateRecoveryCode,
  toPgBytea,
  unwrapDEKWithSecret,
  wrapDEKWithSecret,
} from "./encryption";

describe("generateRecoveryCode", () => {
  it("produces a dash-grouped code from a restricted alphabet", () => {
    const code = generateRecoveryCode();
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{4}(-[A-HJ-NP-Z2-9]{4}){4}$/);
  });

  it("excludes ambiguous characters 0/O/1/I", () => {
    const code = generateRecoveryCode();
    expect(code).not.toMatch(/[01OI]/);
  });

  it("produces different codes on repeated calls (extremely unlikely to collide)", () => {
    const a = generateRecoveryCode();
    const b = generateRecoveryCode();
    expect(a).not.toBe(b);
  });
});

describe("encryptBytes / decryptBytes round trip", () => {
  it("decrypts back to the original plaintext", async () => {
    const dek = await generateDEK();
    const plaintext = new TextEncoder().encode("hello plot data");
    const { ciphertext, iv } = await encryptBytes(plaintext, dek);
    const decrypted = await decryptBytes(ciphertext, iv, dek);
    expect(new TextDecoder().decode(decrypted)).toBe("hello plot data");
  });

  it("handles empty plaintext", async () => {
    const dek = await generateDEK();
    const { ciphertext, iv } = await encryptBytes(new Uint8Array(), dek);
    const decrypted = await decryptBytes(ciphertext, iv, dek);
    expect(decrypted.length).toBe(0);
  });

  it("fails to decrypt with the wrong key", async () => {
    const dek1 = await generateDEK();
    const dek2 = await generateDEK();
    const { ciphertext, iv } = await encryptBytes(new TextEncoder().encode("secret"), dek1);
    await expect(decryptBytes(ciphertext, iv, dek2)).rejects.toThrow();
  });

  it("fails to decrypt with a tampered ciphertext (GCM auth tag mismatch)", async () => {
    const dek = await generateDEK();
    const { ciphertext, iv } = await encryptBytes(new TextEncoder().encode("secret"), dek);
    const tampered = new Uint8Array(ciphertext);
    tampered[0] ^= 0xff;
    await expect(decryptBytes(tampered, iv, dek)).rejects.toThrow();
  });
});

describe("encryptJSON / decryptJSON round trip", () => {
  it("round-trips objects, arrays, and primitives", async () => {
    const dek = await generateDEK();
    const payload = { a: 1, b: ["x", "y"], c: null, d: true };
    const { ciphertext, iv } = await encryptJSON(payload, dek);
    const result = await decryptJSON<typeof payload>(ciphertext, iv, dek);
    expect(result).toEqual(payload);
  });
});

describe("wrapDEKWithSecret / unwrapDEKWithSecret round trip", () => {
  it("unwraps to a usable key that decrypts data encrypted by the original", async () => {
    const dek = await generateDEK();
    const { salt, wrapped, iv } = await wrapDEKWithSecret(dek, "correct horse battery staple");
    const unwrapped = await unwrapDEKWithSecret(
      "correct horse battery staple",
      salt,
      wrapped,
      iv,
    );
    const { ciphertext, iv: dataIv } = await encryptBytes(
      new TextEncoder().encode("payload"),
      dek,
    );
    const decrypted = await decryptBytes(ciphertext, dataIv, unwrapped);
    expect(new TextDecoder().decode(decrypted)).toBe("payload");
  }, 15000);

  it("fails to unwrap with the wrong secret", async () => {
    const dek = await generateDEK();
    const { salt, wrapped, iv } = await wrapDEKWithSecret(dek, "right-secret");
    await expect(unwrapDEKWithSecret("wrong-secret", salt, wrapped, iv)).rejects.toThrow();
  }, 15000);
});

describe("toPgBytea / fromPgBytea", () => {
  it("round-trips arbitrary bytes through the bytea hex format", () => {
    const bytes = new Uint8Array([0, 1, 255, 16, 128]);
    const hex = toPgBytea(bytes);
    expect(hex).toBe("\\x0001ff1080");
    expect(fromPgBytea(hex)).toEqual(bytes);
  });

  it("handles an empty byte array", () => {
    expect(toPgBytea(new Uint8Array())).toBe("\\x");
    expect(fromPgBytea("\\x")).toEqual(new Uint8Array());
  });

  it("parses hex without the leading backslash-x prefix", () => {
    expect(fromPgBytea("0001ff")).toEqual(new Uint8Array([0, 1, 255]));
  });
});
