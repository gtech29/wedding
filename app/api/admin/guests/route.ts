import { z } from "zod";
import { requireAdmin } from "@/lib/server/auth";
import { guestSchema } from "@/lib/security/validation";
import { failure, HttpError, input, json, sameOrigin } from "@/lib/server/http";

async function save(request: Request, updating: boolean) {
  try {
    sameOrigin(request);
    const { db } = await requireAdmin();
    const values = await input(request, guestSchema);
    if (updating !== Boolean(values.id))
      throw new HttpError(400, "invalid", "Choose a guest and try again.");
    const { data, error } = await db.rpc("admin_save_guest", {
      p_id: values.id ?? null,
      p_household_id: values.householdId,
      p_first_name: values.firstName,
      p_last_name: values.lastName,
      p_plus_one_allowed: values.plusOneAllowed,
      p_adult_confirmed: values.adultConfirmed,
    });
    if (error)
      throw new HttpError(
        400,
        "invalid",
        error.message.includes("DUPLICATE_NAME_REQUIRES_DISTINCT_CONTACT")
          ? "Guests with the same exact name need a distinct household email or phone. Update household contacts first."
          : "The guest could not be saved. Confirm adult status, household, and plus-one permissions.",
      );
    return json({ ok: true, id: data });
  } catch (error) {
    return failure(error);
  }
}
export const POST = (request: Request) => save(request, false);
export const PATCH = (request: Request) => save(request, true);
export async function DELETE(request: Request) {
  try {
    sameOrigin(request);
    const { db } = await requireAdmin();
    const { id } = await input(request, z.object({ id: z.uuid() }).strict());
    const { error } = await db.rpc("admin_delete_guest", { p_id: id });
    if (error)
      throw new HttpError(
        400,
        "invalid",
        "The guest could not be removed. Refresh and try again.",
      );
    return json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
