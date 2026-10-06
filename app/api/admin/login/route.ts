import { z } from "zod";
import { authClient } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import { rateLimit } from "@/lib/security/rate-limit";
import { failure, HttpError, input, json, sameOrigin } from "@/lib/server/http";

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { email, password } = await input(
      request,
      z
        .object({
          email: z.email().max(254),
          password: z.string().min(1).max(200),
        })
        .strict(),
    );
    await rateLimit(request, "admin-login", 8);
    await rateLimit(request, "admin-account", 10, email.trim().toLowerCase());
    const auth = await authClient();
    const { data, error } = await auth.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.user)
      throw new HttpError(
        401,
        "unauthorized",
        "Unable to sign in with those details.",
      );
    const { data: admin, error: adminError } = await serviceClient()
      .from("admin_users")
      .select("user_id")
      .eq("user_id", data.user.id)
      .maybeSingle();
    if (adminError || !admin) {
      await auth.auth.signOut();
      throw new HttpError(
        401,
        "unauthorized",
        "Unable to sign in with those details.",
      );
    }
    return json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
