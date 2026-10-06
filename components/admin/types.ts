export interface AdminRsvp {
  id: string;
  guest_id: string;
  attending: boolean;
  dietary_restrictions: string | null;
  created_at: string;
  submitted_at: string;
  updated_at: string;
}

export interface AdminGuest {
  id: string;
  household_id: string;
  first_name: string;
  last_name: string;
  plus_one_allowed: boolean;
  is_plus_one: boolean;
  sponsor_guest_id: string | null;
  adult_confirmed: boolean;
  created_at: string;
  updated_at: string;
  rsvp: AdminRsvp | null;
}

export interface AdminHousehold {
  id: string;
  display_name: string;
  primary_email: string | null;
  primary_phone: string | null;
  created_at: string;
  updated_at: string;
  guests: AdminGuest[];
}

export interface AdminData {
  households: AdminHousehold[];
  deadline: string | null;
}

export type GuestFilter =
  "all" | "attending" | "declined" | "unanswered" | "plus-one";
export type AdminView =
  "overview" | "guests" | "households" | "unanswered" | "import";

export function guestName(guest: AdminGuest): string {
  return (
    [guest.first_name, guest.last_name].filter(Boolean).join(" ") ||
    (guest.is_plus_one ? "Approved plus one" : "Unnamed guest")
  );
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "No response yet";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export class AdminApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

export async function adminRequest<T>(
  path: string,
  body?: unknown,
  method = "POST",
): Promise<T> {
  const response = await fetch(path, {
    method: body === undefined ? "GET" : method,
    cache: "no-store",
    credentials: "same-origin",
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new AdminApiError(
      result.error || "Something went wrong. Please try again.",
      response.status,
    );
  return result as T;
}
