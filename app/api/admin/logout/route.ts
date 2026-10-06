import { authClient } from "@/lib/supabase/server";
import { failure, json, sameOrigin } from "@/lib/server/http";

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const auth = await authClient();
    const { error } = await auth.auth.signOut();
    if (error) throw new Error("SERVICE_UNAVAILABLE");
    return json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
