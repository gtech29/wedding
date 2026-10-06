export type Rsvp = {
  id: string;
  guest_id: string;
  attending: boolean;
  dietary_restrictions: string;
  created_at: string;
  submitted_at: string;
  updated_at: string;
};

export type Guest = {
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
  rsvp: Rsvp | null;
};

export type Household = {
  id: string;
  display_name: string;
  primary_email: string | null;
  primary_phone: string | null;
  created_at: string;
  updated_at: string;
  guests: Guest[];
};

export type PublicHousehold = Pick<Household, "id" | "display_name"> & {
  guests: (Pick<
    Guest,
    | "id"
    | "first_name"
    | "last_name"
    | "plus_one_allowed"
    | "is_plus_one"
    | "sponsor_guest_id"
  > & { rsvp: Pick<Rsvp, "attending" | "dietary_restrictions"> | null })[];
};
