import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { serviceClient } from "@/lib/supabase/service";
import { HttpError } from "@/lib/server/http";

const COOKIE = "wedding-rsvp";
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/api/rsvp",
  maxAge: 900,
};
export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export function newSessionToken() {
  return randomBytes(32).toString("hex");
}

export async function setSessionCookie(token: string) {
  (await cookies()).set(COOKIE, token, cookieOptions);
}

export async function sessionHash() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token))
    throw new HttpError(401, "expired", "Please verify your invitation again.");
  return hashToken(token);
}

export async function clearSession(revoke = false) {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (revoke && token && /^[a-f0-9]{64}$/.test(token)) {
    const { error } = await serviceClient()
      .from("rsvp_sessions")
      .delete()
      .eq("token_hash", hashToken(token));
    if (error) throw new Error("SERVICE_UNAVAILABLE");
  }
  jar.set(COOKIE, "", { ...cookieOptions, maxAge: 0 });
}
