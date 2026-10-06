import { randomInt } from "node:crypto";
import { lookupSchema } from "@/lib/security/validation";
import { rateLimit } from "@/lib/security/rate-limit";
import {
  clearSession,
  hashToken,
  newSessionToken,
  setSessionCookie,
} from "@/lib/security/session";
import {
  deadline,
  failure,
  HttpError,
  input,
  json,
  sameOrigin,
} from "@/lib/server/http";
import { serviceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const started = Date.now();
  const minimumDelay = 350 + randomInt(100);
  try {
    sameOrigin(request);
    const values = await input(request, lookupSchema);
    await rateLimit(request, "lookup-ip", 15);
    await rateLimit(
      request,
      "lookup-name",
      30,
      `${values.firstName.toLowerCase()}\0${values.lastName.toLowerCase()}`,
    );
    await clearSession(true);
    const db = serviceClient();
    const token = newSessionToken();
    const { data, error } = await db.rpc("open_invitation_session", {
      p_first_name: values.firstName,
      p_last_name: values.lastName,
      p_verification: values.verification ?? null,
      p_token_hash: hashToken(token),
      p_deadline: deadline(),
    });
    if (error) {
      if (error.message.includes("RSVP_CLOSED"))
        throw new HttpError(
          403,
          "closed",
          "The RSVP deadline has passed. Please contact Sarah or Juan.",
        );
      throw new Error("SERVICE_UNAVAILABLE");
    }
    if (!data) throw new Error("SERVICE_UNAVAILABLE");
    if (data.status === "verified") await setSessionCookie(token);
    return json(data);
  } catch (error) {
    return failure(error);
  } finally {
    const remaining = minimumDelay - (Date.now() - started);
    if (remaining > 0)
      await new Promise((resolve) => setTimeout(resolve, remaining));
  }
}
