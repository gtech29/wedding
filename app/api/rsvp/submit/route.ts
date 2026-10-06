import { submitSchema } from "@/lib/security/validation";
import { clearSession, sessionHash } from "@/lib/security/session";
import { rateLimit } from "@/lib/security/rate-limit";
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
  try {
    sameOrigin(request);
    const values = await input(request, submitSchema);
    const hash = await sessionHash();
    await rateLimit(request, "submit", 20);
    const { error } = await serviceClient().rpc("submit_household_rsvp", {
      p_token_hash: hash,
      p_responses: values.responses,
      p_deadline: deadline(),
    });
    if (error) {
      if (error.message.includes("RSVP_EXPIRED")) {
        await clearSession();
        throw new HttpError(
          401,
          "expired",
          "Please verify your invitation again.",
        );
      }
      if (error.message.includes("RSVP_CLOSED"))
        throw new HttpError(
          403,
          "closed",
          "The RSVP deadline has passed. Please contact Sarah or Juan.",
        );
      if (error.message.includes("RSVP_INVALID"))
        throw new HttpError(
          400,
          "invalid",
          "Check each invited guest's response and try again.",
        );
      throw new Error("SERVICE_UNAVAILABLE");
    }
    await clearSession();
    return json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
