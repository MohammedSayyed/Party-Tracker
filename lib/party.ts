/**
 * Phase 1 tracks exactly one party. The id is baked in at build time so the
 * client and the server routes agree on it without passing it around.
 */
export const PARTY_ID =
  process.env.NEXT_PUBLIC_PARTY_ID?.trim() || "TEAM-PARTY-LOCAL";
