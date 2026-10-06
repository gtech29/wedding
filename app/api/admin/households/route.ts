import { z } from "zod";
import { requireAdmin } from "@/lib/server/auth";
import { householdSchema } from "@/lib/security/validation";
import { failure, HttpError, input, json, sameOrigin } from "@/lib/server/http";

async function save(request: Request, updating: boolean) {
  try {
    sameOrigin(request);
    const { db } = await requireAdmin();
    const values = await input(request, householdSchema);
    if (updating !== Boolean(values.id))
      throw new HttpError(400, "invalid", "Choose a household and try again.");
    const fields = {
      display_name: values.displayName,
      primary_email: values.primaryEmail || null,
      primary_phone: values.primaryPhone || null,
    };
    const query = updating
      ? db.from("households").update(fields).eq("id", values.id!)
      : db.from("households").insert(fields);
    const { data, error } = await query.select("id").single();
    if (error)
      throw new HttpError(
        400,
        "invalid",
        error.message.includes("DUPLICATE_NAME_REQUIRES_DISTINCT_CONTACT")
          ? "Guests with the same exact name need a distinct household email or phone. Keep a distinguishing contact on every invitation."
          : "The household could not be saved. Refresh and try again.",
      );
    return json({ ok: true, id: data.id });
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
    const { data, error } = await db
      .from("households")
      .delete()
      .eq("id", id)
      .select("id");
    if (error || !data?.length)
      throw new HttpError(
        400,
        "invalid",
        "The household could not be removed. Refresh and try again.",
      );
    return json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
