"use client";

import { useEffect, useState } from "react";
import { AdminDashboard } from "@/components/AdminDashboard";

/**
 * Password prompt in front of the dashboard. The password is posted once and
 * exchanged for an httpOnly cookie — it is never kept in component state after
 * that, nor in localStorage, so no client code can read it back.
 */
export function AdminGate() {
  const [checking, setChecking] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/session", { cache: "no-store" });
        const data = (await res.json()) as {
          configured: boolean;
          authenticated: boolean;
        };
        setConfigured(data.configured);
        setAuthed(data.authenticated);
      } catch {
        setError("Couldn't reach the server.");
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    if (busy || password === "") return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Incorrect password.");
        return;
      }
      setPassword("");
      setAuthed(true);
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await fetch("/api/admin/session", { method: "DELETE" });
    setAuthed(false);
  }

  if (checking) {
    return <p className="py-16 text-center text-base font-medium text-ink-faint">Checking…</p>;
  }

  if (!configured) {
    return (
      <div className="space-y-3 py-10">
        <h1 className="text-xl font-black uppercase">Admin unavailable</h1>
        <p className="text-base font-medium text-ink-soft">
          <code className="rounded bg-ink/10 px-1.5 py-0.5">ADMIN_PASSWORD</code>{" "}
          is not set on this deployment, so admin actions are disabled.
        </p>
      </div>
    );
  }

  if (authed) return <AdminDashboard onSignOut={signOut} />;

  return (
    <form onSubmit={signIn} className="space-y-4 py-10">
      <h1 className="text-2xl font-black uppercase tracking-tight">Admin</h1>
      <p className="text-sm font-medium text-ink-soft">
        Enter the admin password to manage the menu and the bill.
      </p>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        aria-label="Admin password"
        placeholder="Password"
        className="h-14 w-full rounded-2xl border-2 border-ink/15 bg-white px-4 text-lg font-semibold outline-none focus:border-flame"
      />
      {error ? (
        <p role="alert" className="rounded-xl bg-flame/10 px-4 py-3 text-center text-sm font-semibold text-flame-dark">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={busy || password === ""}
        className="w-full rounded-2xl bg-flame px-6 py-5 text-lg font-black uppercase tracking-wide text-white shadow-lg shadow-flame/30 transition active:scale-[0.98] disabled:opacity-40"
      >
        {busy ? "Checking…" : "Unlock"}
      </button>
    </form>
  );
}
