import Link from "next/link";
import { getLocale } from "@/lib/i18n/server";
import { Monogram } from "@/components/wedding/Monogram";
export default async function NotFound() {
  const es = (await getLocale()) === "es-MX";
  return (
    <main className="standalone-message">
      <Monogram />
      <p className="eyebrow">404</p>
      <h1>{es ? "Por aquí no era." : "A little off the path."}</h1>
      <p>
        {es
          ? "Esta página no existe. Volvamos a la celebración."
          : "This page couldn’t be found. Let’s get back to the celebration."}
      </p>
      <Link href="/" className="button button-primary">
        {es ? "Volver al inicio" : "Back to home"}
      </Link>
    </main>
  );
}
