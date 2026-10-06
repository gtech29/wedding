"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminDashboard } from "./AdminDashboard";
import { AdminLogin } from "./AdminLogin";
import { AdminApiError, adminRequest, type AdminData } from "./types";

export function AdminApp() {
  const [data, setData] = useState<AdminData | null>(null);
  const [status, setStatus] = useState<
    "loading" | "ready" | "login" | "setup" | "error"
  >("loading");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    try {
      const result = await adminRequest<AdminData>("/api/admin/data");
      setData(result);
      setStatus("ready");
      setMessage("");
    } catch (cause) {
      setData(null);
      if (cause instanceof AdminApiError && cause.status === 503) {
        setStatus("setup");
        setMessage("");
      } else if (
        cause instanceof AdminApiError &&
        (cause.status === 401 || cause.status === 403)
      ) {
        setStatus("login");
        setMessage(
          cause.status === 403
            ? "This account does not have access to wedding management."
            : "",
        );
      } else {
        setStatus("error");
        setMessage(
          cause instanceof Error
            ? cause.message
            : "Unable to connect. Please try again.",
        );
      }
    }
  }, []);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) return load();
    });
    return () => {
      active = false;
    };
  }, [load]);
  function expire() {
    setData(null);
    setStatus("login");
    setMessage("Please sign in again to continue.");
  }
  async function logout() {
    await adminRequest("/api/admin/logout", {});
    setData(null);
    setStatus("login");
    setMessage("");
  }
  if (status === "loading")
    return (
      <main className="admin-root admin-loading" aria-busy="true">
        <span className="admin-login-monogram">
          S<span>&</span>J
        </span>
        <p role="status">Opening your wedding workspace…</p>
      </main>
    );
  if (status === "error")
    return (
      <main className="admin-root admin-loading">
        <h1>We couldn’t open your workspace.</h1>
        <p role="alert">{message}</p>
        <button
          className="admin-button admin-button-primary"
          onClick={() => {
            setStatus("loading");
            void load();
          }}
        >
          Try again
        </button>
      </main>
    );
  if (status === "setup" || status === "login" || !data)
    return (
      <AdminLogin
        configured={status !== "setup"}
        onLogin={load}
        message={message}
      />
    );
  return (
    <AdminDashboard
      data={data}
      onRefresh={load}
      onSessionExpired={expire}
      onLogout={logout}
    />
  );
}
