import "server-only";
import { serviceClient } from "@/lib/supabase/service";
import { deadline } from "@/lib/server/http";
import type { Household } from "@/types/database";

export async function effectiveDeadline() {
  const { data, error } = await serviceClient()
    .from("wedding_settings")
    .select("rsvp_deadline")
    .eq("singleton", true)
    .single();
  if (error) throw new Error("SERVICE_UNAVAILABLE");
  const values = [deadline(), data.rsvp_deadline as string | null].filter(
    (value): value is string => Boolean(value),
  );
  return values.length
    ? new Date(
        Math.min(...values.map((value) => Date.parse(value))),
      ).toISOString()
    : null;
}

export async function allHouseholds() {
  const { data, error } = await serviceClient().rpc("admin_all_households");
  if (error) throw new Error("SERVICE_UNAVAILABLE");
  return data as Household[];
}
