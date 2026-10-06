"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, LockKeyhole, Settings2 } from "lucide-react";
import { adminRequest } from "./types";

export function AdminLogin({
  onLogin,
  configured,
  message,
}: {
  onLogin: () => Promise<void>;
  configured: boolean;
  message?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await adminRequest("/api/admin/login", {
        email: String(form.get("email")).trim(),
        password: String(form.get("password")),
      });
      await onLogin();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to sign in. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="admin-root admin-login-page">
      <Link href="/" className="admin-back-link">
        <ArrowLeft size={15} /> Back to the wedding
      </Link>
      <section className="admin-login-card">
        <div className="admin-login-monogram" aria-label="Sarah and Juan">
          S<span>&</span>J
        </div>
        <span className="admin-eyebrow">SARAH AND JUAN · AUGUST 27, 2027</span>
        <h1>
          A little behind
          <br />
          the celebration.
        </h1>
        <p className="admin-muted">
          Your guest list, invitations, and RSVPs,
          <br />
          thoughtfully kept in one place.
        </p>
        {configured ? (
          <form onSubmit={submit} className="admin-login-form">
            <label htmlFor="admin-email">Email address</label>
            <input
              id="admin-email"
              name="email"
              type="email"
              autoComplete="username"
              placeholder="you@example.com"
              required
              disabled={busy}
            />
            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={busy}
            />
            {(error || message) && (
              <p className="admin-alert admin-alert-error" role="alert">
                {error || message}
              </p>
            )}
            <button
              className="admin-button admin-button-primary"
              disabled={busy}
            >
              {busy ? "Signing in…" : "Sign in"}
              <ArrowRight size={16} />
            </button>
            <p className="admin-login-note">
              <LockKeyhole size={13} /> Private access for authorized
              administrators.
            </p>
          </form>
        ) : (
          <div className="admin-setup" role="status">
            <Settings2 size={23} />
            <h2>Ready when you are.</h2>
            <p>
              Connect your Supabase project and create an authorized
              administrator to start managing invitations.
            </p>
            <p>
              The project README includes the setup steps. Guest information
              will appear here after secure sign-in.
            </p>
          </div>
        )}
      </section>
      <p className="admin-login-footer">SIEMPRE VALLE · VALLE DE GUADALUPE</p>
    </main>
  );
}
