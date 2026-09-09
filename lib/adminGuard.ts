import { NextResponse } from "next/server";
import { isAdminConfigured, isAdminRequest } from "@/lib/admin";

/**
 * Returns a response to send back when the caller is not an admin, or null
 * when the request may proceed. Every admin route calls this first.
 */
export async function denyIfNotAdmin(): Promise<NextResponse | null> {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "Admin is not configured on this deployment." },
      { status: 503 },
    );
  }
  if (!(await isAdminRequest())) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }
  return null;
}
