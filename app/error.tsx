"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const es =
    typeof document !== "undefined" &&
    document.documentElement.lang === "es-MX";
  return (
    <main className="standalone-message">
      <p className="eyebrow">S&amp;J</p>
      <h1>{es ? "Intentemos de nuevo." : "Let’s try that again."}</h1>
      <p>
        {es ? "No pudimos cargar esta página." : "We couldn’t load this page."}
      </p>
      <button className="button button-primary" onClick={reset}>
        {es ? "Volver a intentar" : "Try again"}
      </button>
    </main>
  );
}
