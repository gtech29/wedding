import "server-only";
import { authClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import { HttpError } from "@/lib/server/http";

export async function requireAdmin() {
  const auth = await authClient();
  const {
    data: { user },
    error,
  } = await auth.auth.getUser();
  if (error || !user)
    throw new HttpError(401, "unauthorized", "Please sign in to continue.");
  const db = serviceClient();
  const { data, error: lookupError } = await db
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (lookupError) throw new Error("SERVICE_UNAVAILABLE");
  if (!data)
    throw new HttpError(
      403,
      "forbidden",
      "This account does not have administrator access.",
    );
  return { db, user, auth };
}
