import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "party_tab_admin";

/**
 * Lightweight admin gate for a one-evening event app: a single shared secret
 * in ADMIN_PASSWORD, never shipped to the browser.
 *
 * The browser is handed an httpOnly cookie holding an HMAC of a fixed string
 * keyed by the password — not the password itself — so client JavaScript can
 * neither read the secret nor forge the token. That is deliberately less than
 * a real session system, which this app does not need.
 */
function adminPassword(): string | null {
  const value = process.env.ADMIN_PASSWORD;
  return value && value.length > 0 ? value : null;
}

export function isAdminConfigured(): boolean {
  return adminPassword() !== null;
}

function tokenFor(password: string): string {
  return createHmac("sha256", password).update("party-tab-admin-v1").digest("hex");
}

function equals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length || bufA.length === 0) return false;
  return timingSafeEqual(bufA, bufB);
}

/** True when the supplied password matches ADMIN_PASSWORD. */
export function passwordMatches(candidate: unknown): boolean {
  const expected = adminPassword();
  if (!expected || typeof candidate !== "string" || candidate.length === 0) {
    return false;
  }
  return equals(candidate, expected);
}

export function sessionToken(): string {
  const password = adminPassword();
  if (!password) throw new Error("ADMIN_PASSWORD is not set.");
  return tokenFor(password);
}

/** Reads the cookie and checks it against the configured password. */
export async function isAdminRequest(): Promise<boolean> {
  const password = adminPassword();
  if (!password) return false;
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return equals(token, tokenFor(password));
}
