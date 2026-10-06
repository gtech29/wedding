import "server-only";
import { cookies } from "next/headers";
import type { Locale } from "./types";
export async function getLocale(): Promise<Locale> {
  return (await cookies()).get("wedding-locale")?.value === "es-MX"
    ? "es-MX"
    : "en";
}
