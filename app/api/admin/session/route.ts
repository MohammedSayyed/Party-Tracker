import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  isAdminConfigured,
  isAdminRequest,
  passwordMatches,
  sessionToken,
} from "@/lib/admin";

export const dynamic = "force-dynamic";

const EIGHT_HOURS = 60 * 60 * 8;

/** Tells the admin page whether it already holds a valid session cookie. */
export async function GET() {
  return NextResponse.json({
    configured: isAdminConfigured(),
    authenticated: await isAdminRequest(),
  });
}

/** Exchanges the admin password for an httpOnly session cookie. */
export async function POST(request: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "Admin is not configured on this deployment." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const password = (body as Record<string, unknown> | null)?.password;
  if (!passwordMatches(password)) {
    // Same message whether the password was absent or wrong.
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, sessionToken(), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: EIGHT_HOURS,
  });
  return res;
}

/** Sign out. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
