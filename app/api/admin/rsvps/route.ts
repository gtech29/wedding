import { requireAdmin } from "@/lib/server/auth";
import { manualRsvpSchema } from "@/lib/security/validation";
import { failure, HttpError, input, json, sameOrigin } from "@/lib/server/http";

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { db } = await requireAdmin();
    const values = await input(request, manualRsvpSchema);
    const { error } = await db.rpc("admin_save_rsvp", {
      p_guest_id: values.guestId,
      p_attending: values.attending,
      p_dietary_restrictions: values.dietaryRestrictions,
    });
    if (error)
      throw new HttpError(
        400,
        "invalid",
        "The response could not be saved. An attending plus one needs a name and an attending sponsor.",
      );
    return json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
export const PATCH = POST;
