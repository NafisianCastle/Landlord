"use client";

/**
 * Zero-knowledge encryption for sensitive plot data. Everything here runs in
 * the browser via Web Crypto — the passphrase, recovery code, and unwrapped
 * DEK never leave the client. The server only ever stores wrapped/encrypted
 * bytes. See supabase/migrations/0009_client_side_encryption.sql.
 */

const PBKDF2_ITERATIONS = 600_000;

function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/** TS's lib.dom types Uint8Array as generic over ArrayBufferLike; WebCrypto wants BufferSource. */
function bs(bytes: Uint8Array): BufferSource {
  return bytes as BufferSource;
}

async function deriveWrappingKey(secret: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: bs(salt), iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["wrapKey", "unwrapKey"],
  );
}

export async function generateDEK(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

/** 12 groups of 4 base32-ish chars, e.g. "XY4K-9F2P-...". Shown to the user once at setup. */
export function generateRecoveryCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
  const bytes = randomBytes(20);
  let code = "";
  for (let i = 0; i < bytes.length; i++) {
    code += alphabet[bytes[i] % alphabet.length];
    if ((i + 1) % 4 === 0 && i !== bytes.length - 1) code += "-";
  }
  return code;
}

export interface WrappedKey {
  salt: Uint8Array;
  wrapped: Uint8Array;
  iv: Uint8Array;
}

export async function wrapDEKWithSecret(dek: CryptoKey, secret: string): Promise<WrappedKey> {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const wrappingKey = await deriveWrappingKey(secret, salt);
  const wrapped = await crypto.subtle.wrapKey("raw", dek, wrappingKey, {
    name: "AES-GCM",
    iv: bs(iv),
  });
  return { salt, wrapped: new Uint8Array(wrapped), iv };
}

export async function unwrapDEKWithSecret(
  secret: string,
  salt: Uint8Array,
  wrapped: Uint8Array,
  iv: Uint8Array,
): Promise<CryptoKey> {
  const wrappingKey = await deriveWrappingKey(secret, salt);
  return crypto.subtle.unwrapKey(
    "raw",
    bs(wrapped),
    wrappingKey,
    { name: "AES-GCM", iv: bs(iv) },
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
}

export interface Ciphertext {
  ciphertext: Uint8Array;
  iv: Uint8Array;
}

export async function encryptBytes(plaintext: Uint8Array, dek: CryptoKey): Promise<Ciphertext> {
  const iv = randomBytes(12);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: bs(iv) }, dek, bs(plaintext));
  return { ciphertext: new Uint8Array(ciphertext), iv };
}

export async function decryptBytes(
  ciphertext: Uint8Array,
  iv: Uint8Array,
  dek: CryptoKey,
): Promise<Uint8Array> {
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bs(iv) }, dek, bs(ciphertext));
  return new Uint8Array(plaintext);
}

export async function encryptJSON(data: unknown, dek: CryptoKey): Promise<Ciphertext> {
  return encryptBytes(new TextEncoder().encode(JSON.stringify(data)), dek);
}

export async function decryptJSON<T>(
  ciphertext: Uint8Array,
  iv: Uint8Array,
  dek: CryptoKey,
): Promise<T> {
  const bytes = await decryptBytes(ciphertext, iv, dek);
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

/** Postgres/PostgREST bytea wire format for inserts: "\x" + hex. */
export function toPgBytea(bytes: Uint8Array): string {
  return "\\x" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** PostgREST returns bytea as "\x"-prefixed hex on select. */
export function fromPgBytea(hex: string): Uint8Array {
  const clean = hex.startsWith("\\x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return bytes;
}
