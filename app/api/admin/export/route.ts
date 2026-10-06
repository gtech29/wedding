import { exportHouseholds } from "@/lib/csv";
import { requireAdmin } from "@/lib/server/auth";
import { allHouseholds } from "@/lib/server/data";
import { failure } from "@/lib/server/http";

export async function GET() {
  try {
    await requireAdmin();
    return new Response(exportHouseholds(await allHouseholds()), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="sarah-and-juan-rsvps-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "no-store, private",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return failure(error);
  }
}
