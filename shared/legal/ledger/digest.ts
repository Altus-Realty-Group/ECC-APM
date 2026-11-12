// Deterministic fingerprint (FNV-1a, 64-bit) of a canonical string. Pure and synchronous so it can run anywhere shared code runs.
// It detects accidental or stale-state mismatches between a review/approval and the ledger it describes; it is NOT a security primitive.
const OFFSET = BigInt("0xcbf29ce484222325");
const PRIME = BigInt("0x100000001b3");
const MASK = BigInt("0xffffffffffffffff");

export function fingerprint(text: string): string {
  let h = OFFSET;
  for (let i = 0; i < text.length; i++) { h ^= BigInt(text.charCodeAt(i)); h = (h * PRIME) & MASK; }
  return h.toString(16).padStart(16, "0");
}
