"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Locale } from "@/lib/i18n/types";
export function LanguageToggle({
  locale,
  label,
}: {
  locale: Locale;
  label: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  async function change(next: Locale) {
    if (next === locale) return;
    setSaving(true);
    setError(false);
    try {
      const response = await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next }),
      });
      if (!response.ok) throw new Error();
      startTransition(() => router.refresh());
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="language-wrap">
      <div className="language-toggle" role="group" aria-label={label}>
        <button
          type="button"
          onClick={() => change("en")}
          disabled={pending || saving}
          aria-pressed={locale === "en"}
          aria-label="English"
          lang="en"
        >
          EN
        </button>
        <span aria-hidden="true">/</span>
        <button
          type="button"
          onClick={() => change("es-MX")}
          disabled={pending || saving}
          aria-pressed={locale === "es-MX"}
          aria-label="Español"
          lang="es-MX"
        >
          ES
        </button>
      </div>
      {error && (
        <span role="alert" className="language-error">
          {locale === "en" ? "Please try again." : "Intenta de nuevo."}
        </span>
      )}
    </div>
  );
}
