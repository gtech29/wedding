import "server-only";
import { createHmac } from "node:crypto";
import { serviceClient } from "@/lib/supabase/service";
import { HttpError } from "@/lib/server/http";

export function fingerprint(value: string) {
  const secret = process.env.RSVP_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SERVICE_UNAVAILABLE");
  return createHmac("sha256", secret).update(value).digest("hex");
}

export async function rateLimit(
  request: Request,
  scope: string,
  limit: number,
  identity?: string,
) {
  // Vercel overwrites x-vercel-forwarded-for at its trusted edge. Other hosts must configure a trusted proxy.
  const address = process.env.VERCEL
    ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
    : "local-development";
  const key = fingerprint(`${scope}:${identity || address || "unknown"}`);
  const { data, error } = await serviceClient().rpc("check_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: 900,
  });
  if (error) throw new Error("SERVICE_UNAVAILABLE");
  if (data !== true)
    throw new HttpError(
      429,
      "rate_limited",
      "Please wait a little before trying again.",
    );
}
