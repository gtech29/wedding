import { clearSession } from "@/lib/security/session";
import { failure, json, sameOrigin } from "@/lib/server/http";

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    await clearSession(true);
    return json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
