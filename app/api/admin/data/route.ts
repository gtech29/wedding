import { requireAdmin } from "@/lib/server/auth";
import { allHouseholds, effectiveDeadline } from "@/lib/server/data";
import { failure, json } from "@/lib/server/http";

export async function GET() {
  try {
    await requireAdmin();
    const [households, end] = await Promise.all([
      allHouseholds(),
      effectiveDeadline(),
    ]);
    return json({ households, deadline: end });
  } catch (error) {
    return failure(error);
  }
}
