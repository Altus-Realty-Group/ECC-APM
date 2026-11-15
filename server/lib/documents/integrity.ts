import { createHash } from "node:crypto";

export const sha256Hex = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

/** Delivered bytes must have exactly the registered size and SHA-256. Anything else is an integrity failure. */
export function bytesMatch(bytes: Uint8Array, expected: { byteSize: number; sha256: string }): boolean {
  return bytes.byteLength === expected.byteSize && sha256Hex(bytes) === expected.sha256;
}
