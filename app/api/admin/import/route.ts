import { z } from "zod";
import { previewImport } from "@/lib/csv";
import { requireAdmin } from "@/lib/server/auth";
import { allHouseholds } from "@/lib/server/data";
import { failure, HttpError, input, json, sameOrigin } from "@/lib/server/http";

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { db } = await requireAdmin();
    const values = await input(
      request,
      z
        .object({
          csv: z.string().min(1).max(1_000_000),
          confirm: z.boolean().default(false),
          adultConfirmed: z.literal(true).optional(),
        })
        .strict(),
      1_100_000,
    );
    const preview = previewImport(values.csv, await allHouseholds());
    if (!values.confirm) return json(preview);
    if (!preview.valid)
      return json(
        {
          ...preview,
          error: "Resolve the CSV errors before importing.",
          code: "invalid",
        },
        400,
      );
    if (!values.adultConfirmed)
      throw new HttpError(
        400,
        "invalid",
        "Confirm that every invited guest and allowed plus one is an adult.",
      );
    const { data, error } = await db.rpc("admin_import_guests", {
      p_rows: preview.rows,
      p_adult_confirmed: true,
    });
    if (error)
      throw new HttpError(
        409,
        "invalid",
        "The guest list changed or contains a conflict. Preview the CSV again before importing. Nothing was imported.",
      );
    return json({ ok: true, imported: data });
  } catch (error) {
    return failure(error);
  }
}
