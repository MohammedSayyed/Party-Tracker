import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** Opaque token handed to the submitting browser only. */
export function createUndoToken(): string {
  return randomBytes(24).toString("base64url");
}

export function hashUndoToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Constant-time compare of two hex digests of equal length. */
export function undoTokenMatches(token: string, storedHash: string): boolean {
  const a = Buffer.from(hashUndoToken(token), "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length !== b.length || a.length === 0) return false;
  return timingSafeEqual(a, b);
}
