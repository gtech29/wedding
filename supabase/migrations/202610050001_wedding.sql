-- Apply once to a fresh Supabase project. No guest records or administrator credentials are seeded.
begin;

create extension if not exists pgcrypto;

create table public.households (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (length(btrim(display_name)) between 1 and 150),
  primary_email text check (primary_email is null or length(primary_email) <= 254),
  primary_phone text check (primary_phone is null or length(primary_phone) <= 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.guests (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  first_name text not null default '' check (length(first_name) <= 100),
  last_name text not null default '' check (length(last_name) <= 100),
  normalized_first_name text generated always as (lower(btrim(first_name))) stored,
  normalized_last_name text generated always as (lower(btrim(last_name))) stored,
  plus_one_allowed boolean not null default false,
  is_plus_one boolean not null default false,
  sponsor_guest_id uuid unique,
  adult_confirmed boolean not null default false check (adult_confirmed = true),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id),
  constraint guest_name_required check (is_plus_one or (length(btrim(first_name)) > 0 and length(btrim(last_name)) > 0)),
  constraint plus_one_shape check ((is_plus_one and sponsor_guest_id is not null and not plus_one_allowed) or (not is_plus_one and sponsor_guest_id is null)),
  constraint sponsor_same_household foreign key (sponsor_guest_id, household_id) references public.guests(id, household_id) on delete cascade deferrable initially deferred
);
create index guests_exact_name_idx on public.guests(normalized_first_name, normalized_last_name) where not is_plus_one;
create index guests_household_idx on public.guests(household_id);

create table public.rsvps (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null unique references public.guests(id) on delete cascade,
  attending boolean not null,
  dietary_restrictions text not null default '' check (length(dietary_restrictions) <= 1000),
  -- Additional questions should be normalized into question/answer tables when introduced.
  created_at timestamptz not null default now(),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.wedding_settings (
  singleton boolean primary key default true check (singleton),
  rsvp_deadline timestamptz,
  updated_at timestamptz not null default now()
);
insert into public.wedding_settings(singleton) values (true);

create table public.rsvp_sessions (
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  household_id uuid not null references public.households(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  consumed_at timestamptz
);
create index rsvp_sessions_expiry_idx on public.rsvp_sessions(expires_at);
create index rsvp_sessions_household_idx on public.rsvp_sessions(household_id);

create table public.rate_limits (
  bucket_key text not null,
  window_start timestamptz not null,
  attempts integer not null check (attempts > 0),
  primary key (bucket_key, window_start)
);
create index rate_limits_expiry_idx on public.rate_limits(window_start);

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger households_updated before update on public.households for each row execute function public.touch_updated_at();
create trigger guests_updated before update on public.guests for each row execute function public.touch_updated_at();
create trigger rsvps_updated before update on public.rsvps for each row execute function public.touch_updated_at();
create trigger settings_updated before update on public.wedding_settings for each row execute function public.touch_updated_at();

-- A permission always corresponds to one pre-created adult slot. Only server-owned transactions manage this relationship.
create function public.check_plus_one_permission() returns trigger
language plpgsql set search_path = public, pg_temp as $$
declare v_guest public.guests; v_sponsor uuid;
begin
  -- Inspect the final row, since a deferred trigger may describe a slot changed or deleted later in the transaction.
  if tg_op = 'DELETE' then
    v_sponsor := old.sponsor_guest_id;
  else
    select * into v_guest from public.guests where id = new.id;
    if found then
      v_sponsor := v_guest.sponsor_guest_id;
      if v_guest.is_plus_one and not exists (
        select 1 from public.guests g where g.id = v_guest.sponsor_guest_id and g.household_id = v_guest.household_id and g.plus_one_allowed and not g.is_plus_one
      ) then raise exception 'INVALID_PLUS_ONE'; end if;
      if not v_guest.is_plus_one and ((v_guest.plus_one_allowed and (select count(*) from public.guests where sponsor_guest_id = v_guest.id) <> 1)
        or (not v_guest.plus_one_allowed and exists(select 1 from public.guests where sponsor_guest_id = v_guest.id))) then raise exception 'INVALID_PLUS_ONE'; end if;
    end if;
  end if;
  if v_sponsor is not null and exists(select 1 from public.guests where id = v_sponsor and plus_one_allowed)
    and (select count(*) from public.guests where sponsor_guest_id = v_sponsor) <> 1 then raise exception 'INVALID_PLUS_ONE'; end if;
  if tg_op = 'UPDATE' and old.sponsor_guest_id is distinct from new.sponsor_guest_id and old.sponsor_guest_id is not null
    and exists(select 1 from public.guests where id = old.sponsor_guest_id and plus_one_allowed)
    and (select count(*) from public.guests where sponsor_guest_id = old.sponsor_guest_id) <> 1 then raise exception 'INVALID_PLUS_ONE'; end if;
  return null;
end;
$$;
create constraint trigger validate_plus_one after insert or update or delete on public.guests deferrable initially deferred for each row execute function public.check_plus_one_permission();

-- A duplicate exact name is legitimate only if each affected invitation has a distinguishing full contact.
-- Deferred checks validate the final import/transaction state, including contacts supplied by a later CSV row.
create function public.assert_identity_contacts(p_first text, p_last text) returns void
language plpgsql set search_path = public, pg_temp as $$
begin
  if (select count(*) from public.guests where not is_plus_one and normalized_first_name = p_first and normalized_last_name = p_last) <= 1 then return; end if;
  if exists (
    with matches as (
      select distinct h.id, nullif(lower(btrim(h.primary_email)), '') as email, nullif(regexp_replace(h.primary_phone, '[^0-9]', '', 'g'), '') as phone
      from public.households h join public.guests g on g.household_id = h.id
      where not g.is_plus_one and g.normalized_first_name = p_first and g.normalized_last_name = p_last
    )
    select 1 from matches candidate where not (
      (candidate.email is not null and not exists(select 1 from matches other where other.id <> candidate.id and other.email = candidate.email))
      or (candidate.phone is not null and length(candidate.phone) between 7 and 15 and not exists(select 1 from matches other where other.id <> candidate.id and other.phone = candidate.phone))
    )
  ) then raise exception 'DUPLICATE_NAME_REQUIRES_DISTINCT_CONTACT'; end if;
end;
$$;

create function public.check_guest_identity_contacts() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if not new.is_plus_one then perform public.assert_identity_contacts(new.normalized_first_name, new.normalized_last_name); end if;
  return new;
end;
$$;
create constraint trigger validate_guest_identity after insert or update on public.guests deferrable initially deferred for each row execute function public.check_guest_identity_contacts();

create function public.check_household_identity_contacts() returns trigger
language plpgsql set search_path = public, pg_temp as $$
declare v_guest record;
begin
  for v_guest in select normalized_first_name, normalized_last_name from public.guests where household_id = new.id and not is_plus_one loop
    perform public.assert_identity_contacts(v_guest.normalized_first_name, v_guest.normalized_last_name);
  end loop;
  return new;
end;
$$;
create constraint trigger validate_household_identity after update on public.households deferrable initially deferred for each row execute function public.check_household_identity_contacts();

create function public.check_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare v_attempts integer; v_window timestamptz;
begin
  if length(p_key) <> 64 or p_limit < 1 or p_limit > 1000 or p_window_seconds < 60 then raise exception 'INVALID_RATE_LIMIT'; end if;
  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  delete from public.rate_limits where window_start < now() - interval '1 day';
  delete from public.rsvp_sessions where expires_at < now() - interval '1 day';
  insert into public.rate_limits(bucket_key, window_start, attempts) values(p_key, v_window, 1)
  on conflict (bucket_key, window_start) do update set attempts = least(public.rate_limits.attempts + 1, p_limit + 1)
  returning attempts into v_attempts;
  return v_attempts <= p_limit;
end;
$$;

-- Exact-name matching is performed in PostgreSQL so it uses the same normalization as the stored columns.
-- Unknown and ambiguous names both return NULL; no list, hints, or contact data ever leave this function.
create function public.resolve_invitation(p_first_name text, p_last_name text, p_verification text default null)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_count integer; v_household uuid;
begin
  if p_verification is null then
    select count(*), (array_agg(g.household_id))[1] into v_count, v_household from public.guests g
    where not g.is_plus_one and g.normalized_first_name = lower(btrim(p_first_name)) and g.normalized_last_name = lower(btrim(p_last_name));
  else
    select count(distinct g.household_id), (array_agg(g.household_id))[1] into v_count, v_household
    from public.guests g join public.households h on h.id = g.household_id
    where not g.is_plus_one and g.normalized_first_name = lower(btrim(p_first_name)) and g.normalized_last_name = lower(btrim(p_last_name))
      and ((h.primary_email is not null and lower(btrim(h.primary_email)) = lower(btrim(p_verification)))
        or (p_verification ~ '^[+0-9 ().-]+$' and length(regexp_replace(p_verification, '[^0-9]', '', 'g')) between 7 and 15
          and h.primary_phone is not null and regexp_replace(h.primary_phone, '[^0-9]', '', 'g') = regexp_replace(p_verification, '[^0-9]', '', 'g')));
  end if;
  if v_count = 1 then return v_household; end if;
  return null;
end;
$$;

create function public.public_invitation(p_household_id uuid)
returns jsonb language sql security definer set search_path = public, pg_temp as $$
  select jsonb_build_object('id', h.id, 'display_name', h.display_name, 'guests', coalesce((
    select jsonb_agg(jsonb_build_object('id', g.id, 'first_name', g.first_name, 'last_name', g.last_name,
      'plus_one_allowed', g.plus_one_allowed, 'is_plus_one', g.is_plus_one, 'sponsor_guest_id', g.sponsor_guest_id,
      'rsvp', case when r.id is null then null else jsonb_build_object('attending', r.attending, 'dietary_restrictions', r.dietary_restrictions) end)
      order by g.is_plus_one, g.created_at, g.id)
    from public.guests g left join public.rsvps r on r.guest_id = g.id where g.household_id = h.id
  ), '[]'::jsonb)) from public.households h where h.id = p_household_id;
$$;

-- Verify, lock, project, and create a scoped session in one transaction. Guest edits cannot race the projection.
create function public.open_invitation_session(p_first_name text, p_last_name text, p_verification text, p_token_hash text, p_deadline timestamptz default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_household uuid; v_deadline timestamptz;
begin
  v_household := public.resolve_invitation(p_first_name, p_last_name, p_verification);
  if v_household is null then return jsonb_build_object('status', 'verification_required'); end if;
  perform 1 from public.households where id = v_household for share;
  if not found or public.resolve_invitation(p_first_name, p_last_name, p_verification) is distinct from v_household then
    return jsonb_build_object('status', 'verification_required');
  end if;
  select least(rsvp_deadline, p_deadline) into v_deadline from public.wedding_settings where singleton = true for share;
  if v_deadline is not null and now() > v_deadline then raise exception 'RSVP_CLOSED'; end if;
  insert into public.rsvp_sessions(token_hash, household_id, expires_at) values(p_token_hash, v_household, now() + interval '15 minutes');
  return jsonb_build_object('status', 'verified', 'household', public.public_invitation(v_household), 'deadline', v_deadline);
end;
$$;

create function public.invalidate_household_sessions() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  delete from public.rsvp_sessions where household_id = new.id;
  return new;
end;
$$;
create trigger household_contact_sessions after update of primary_email, primary_phone on public.households for each row execute function public.invalidate_household_sessions();

-- The lock order is household -> session -> guests. All guest-management writes use the same household lock.
create function public.submit_household_rsvp(p_token_hash text, p_responses jsonb, p_deadline timestamptz default null)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_household uuid; v_session public.rsvp_sessions; v_deadline timestamptz; v_count integer; v_response jsonb; v_guest public.guests; v_sponsor_attending boolean;
begin
  select household_id into v_household from public.rsvp_sessions where token_hash = p_token_hash;
  if v_household is null then raise exception 'RSVP_EXPIRED'; end if;
  perform 1 from public.households where id = v_household for update;
  select * into v_session from public.rsvp_sessions where token_hash = p_token_hash for update;
  if not found or v_session.expires_at <= now() or v_session.consumed_at is not null then raise exception 'RSVP_EXPIRED'; end if;
  select least(rsvp_deadline, p_deadline) into v_deadline from public.wedding_settings where singleton = true for share;
  if v_deadline is not null and now() > v_deadline then raise exception 'RSVP_CLOSED'; end if;
  if jsonb_typeof(p_responses) <> 'array' or jsonb_array_length(p_responses) = 0 or jsonb_array_length(p_responses) > 50 then raise exception 'RSVP_INVALID'; end if;
  select count(*) into v_count from public.guests where household_id = v_household;
  if jsonb_array_length(p_responses) <> v_count or
    (select count(distinct item->>'guestId') from jsonb_array_elements(p_responses) item) <> v_count then raise exception 'RSVP_INVALID'; end if;
  for v_response in select * from jsonb_array_elements(p_responses) loop
    select * into v_guest from public.guests where id = (v_response->>'guestId')::uuid and household_id = v_household for update;
    if not found or jsonb_typeof(v_response->'attending') <> 'boolean' or length(coalesce(v_response->>'dietaryRestrictions', '')) > 1000 then raise exception 'RSVP_INVALID'; end if;
    if v_guest.is_plus_one then
      if not exists(select 1 from public.guests where id = v_guest.sponsor_guest_id and household_id = v_household and plus_one_allowed and not is_plus_one) then raise exception 'RSVP_INVALID'; end if;
      select (item->>'attending')::boolean into v_sponsor_attending from jsonb_array_elements(p_responses) item where item->>'guestId' = v_guest.sponsor_guest_id::text;
      if (v_response->>'attending')::boolean then
        if not coalesce(v_sponsor_attending, false) or not coalesce((v_response->>'adultConfirmed')::boolean, false) or
          length(btrim(coalesce(v_response->>'firstName', ''))) not between 1 and 100 or length(btrim(coalesce(v_response->>'lastName', ''))) not between 1 and 100 then raise exception 'RSVP_INVALID'; end if;
        update public.guests set first_name = btrim(v_response->>'firstName'), last_name = btrim(v_response->>'lastName') where id = v_guest.id;
      end if;
    elsif v_response ? 'firstName' or v_response ? 'lastName' then raise exception 'RSVP_INVALID';
    end if;
    insert into public.rsvps(guest_id, attending, dietary_restrictions) values(v_guest.id, (v_response->>'attending')::boolean, case when (v_response->>'attending')::boolean then coalesce(v_response->>'dietaryRestrictions', '') else '' end)
    on conflict(guest_id) do update set attending = excluded.attending, dietary_restrictions = excluded.dietary_restrictions, submitted_at = now();
  end loop;
  -- Consume all sessions for this invitation, including another previously opened browser tab.
  update public.rsvp_sessions set consumed_at = now() where household_id = v_household and consumed_at is null;
end;
$$;

create function public.admin_save_guest(p_id uuid, p_household_id uuid, p_first_name text, p_last_name text, p_plus_one_allowed boolean, p_adult_confirmed boolean)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_guest public.guests; v_id uuid; v_previous_household uuid;
begin
  if p_adult_confirmed is distinct from true or length(btrim(p_first_name)) not between 1 and 100 or length(btrim(p_last_name)) not between 1 and 100 then raise exception 'INVALID_GUEST'; end if;
  select household_id into v_previous_household from public.guests where id = p_id;
  perform 1 from public.households where id in (p_household_id, v_previous_household) order by id for update;
  if not exists(select 1 from public.households where id = p_household_id) then raise exception 'INVALID_GUEST'; end if;
  if p_id is null then
    insert into public.guests(household_id, first_name, last_name, plus_one_allowed, adult_confirmed)
    values(p_household_id, btrim(p_first_name), btrim(p_last_name), p_plus_one_allowed, true) returning id into v_id;
  else
    select * into v_guest from public.guests where id = p_id for update;
    if not found then raise exception 'INVALID_GUEST'; end if;
    if v_guest.is_plus_one and (p_plus_one_allowed or p_household_id <> v_guest.household_id) then raise exception 'INVALID_GUEST'; end if;
    update public.guests set household_id = p_household_id, first_name = btrim(p_first_name), last_name = btrim(p_last_name), plus_one_allowed = p_plus_one_allowed, adult_confirmed = true where id = p_id;
    v_id := p_id;
  end if;
  if not coalesce(v_guest.is_plus_one, false) then
    if p_plus_one_allowed then
      insert into public.guests(household_id, first_name, last_name, is_plus_one, sponsor_guest_id, adult_confirmed)
      values(p_household_id, '', '', true, v_id, true)
      on conflict(sponsor_guest_id) do update set household_id = excluded.household_id;
    else delete from public.guests where sponsor_guest_id = v_id;
    end if;
  end if;
  if (select count(*) from public.guests where household_id = p_household_id) > 50 then raise exception 'HOUSEHOLD_TOO_LARGE'; end if;
  delete from public.rsvp_sessions where household_id in (p_household_id, v_previous_household);
  return v_id;
end;
$$;

create function public.admin_delete_guest(p_id uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_household uuid; v_sponsor uuid;
begin
  select household_id, sponsor_guest_id into v_household, v_sponsor from public.guests where id = p_id;
  if v_household is null then raise exception 'INVALID_GUEST'; end if;
  perform 1 from public.households where id = v_household for update;
  if v_sponsor is not null then update public.guests set plus_one_allowed = false where id = v_sponsor; end if;
  delete from public.guests where id = p_id;
  delete from public.rsvp_sessions where household_id = v_household;
end;
$$;

create function public.admin_save_rsvp(p_guest_id uuid, p_attending boolean, p_dietary_restrictions text)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare v_guest public.guests;
begin
  select * into v_guest from public.guests where id = p_guest_id;
  if not found or p_attending is null or length(p_dietary_restrictions) > 1000 then raise exception 'INVALID_GUEST'; end if;
  perform 1 from public.households where id = v_guest.household_id for update;
  select * into v_guest from public.guests where id = p_guest_id for update;
  if v_guest.is_plus_one and p_attending and (length(btrim(v_guest.first_name)) = 0 or length(btrim(v_guest.last_name)) = 0 or not exists(select 1 from public.rsvps where guest_id = v_guest.sponsor_guest_id and attending)) then raise exception 'PLUS_ONE_REQUIRES_SPONSOR_AND_NAME'; end if;
  insert into public.rsvps(guest_id, attending, dietary_restrictions) values(p_guest_id, p_attending, case when p_attending then coalesce(p_dietary_restrictions, '') else '' end)
  on conflict(guest_id) do update set attending = excluded.attending, dietary_restrictions = excluded.dietary_restrictions, submitted_at = now();
  if not v_guest.is_plus_one and not p_attending then
    insert into public.rsvps(guest_id, attending, dietary_restrictions) select id, false, '' from public.guests where sponsor_guest_id = p_guest_id
    on conflict(guest_id) do update set attending = false, dietary_restrictions = '', submitted_at = now();
  end if;
  delete from public.rsvp_sessions where household_id = v_guest.household_id;
end;
$$;

create function public.admin_all_households()
returns jsonb language sql security definer set search_path = public, pg_temp as $$
  select coalesce(jsonb_agg(to_jsonb(h) || jsonb_build_object('guests', coalesce((
    select jsonb_agg((to_jsonb(g) - 'normalized_first_name' - 'normalized_last_name') || jsonb_build_object('rsvp', to_jsonb(r)) order by g.is_plus_one, g.created_at, g.id)
    from public.guests g left join public.rsvps r on r.guest_id = g.id where g.household_id = h.id
  ), '[]'::jsonb)) order by h.display_name, h.id), '[]'::jsonb) from public.households h;
$$;

create function public.admin_import_guests(p_rows jsonb, p_adult_confirmed boolean)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare v_row jsonb; v_household uuid; v_existing_count integer; v_imported integer := 0; v_email text; v_phone text;
begin
  if p_adult_confirmed is distinct from true or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) not between 1 and 2000 then raise exception 'INVALID_IMPORT'; end if;
  -- Serialize imports and household changes, then validate again under a database lock.
  lock table public.households in share row exclusive mode;
  lock table public.guests in share row exclusive mode;
  for v_row in select * from jsonb_array_elements(p_rows) loop
    if length(btrim(v_row->>'household')) not between 1 and 150 then raise exception 'INVALID_IMPORT'; end if;
    select count(*), (array_agg(id))[1] into v_existing_count, v_household from public.households where lower(btrim(display_name)) = lower(btrim(v_row->>'household'));
    if v_existing_count > 1 then raise exception 'AMBIGUOUS_HOUSEHOLD'; end if;
    v_email := nullif(lower(btrim(v_row->>'email')), '');
    v_phone := nullif(btrim(v_row->>'phone'), '');
    if v_household is null then
      insert into public.households(display_name, primary_email, primary_phone) values(btrim(v_row->>'household'), v_email, v_phone) returning id into v_household;
    else
      if exists(select 1 from public.households where id = v_household and ((primary_email is not null and v_email is not null and lower(primary_email) <> v_email) or (primary_phone is not null and v_phone is not null and regexp_replace(primary_phone, '[^0-9]', '', 'g') <> regexp_replace(v_phone, '[^0-9]', '', 'g')))) then raise exception 'CONFLICTING_CONTACT'; end if;
      update public.households set primary_email = coalesce(primary_email, v_email), primary_phone = coalesce(primary_phone, v_phone) where id = v_household;
    end if;
    if exists(select 1 from public.guests where household_id = v_household and normalized_first_name = lower(btrim(v_row->>'firstName')) and normalized_last_name = lower(btrim(v_row->>'lastName'))) then raise exception 'DUPLICATE_GUEST'; end if;
    perform public.admin_save_guest(null, v_household, v_row->>'firstName', v_row->>'lastName', (v_row->>'plusOneAllowed')::boolean, true);
    v_imported := v_imported + 1;
  end loop;
  return v_imported;
end;
$$;

-- Every private table is server-only. An authenticated Supabase user alone has no table privileges.
alter table public.households enable row level security;
alter table public.guests enable row level security;
alter table public.rsvps enable row level security;
alter table public.admin_users enable row level security;
alter table public.wedding_settings enable row level security;
alter table public.rsvp_sessions enable row level security;
alter table public.rate_limits enable row level security;
revoke all on table public.households, public.guests, public.rsvps, public.admin_users, public.wedding_settings, public.rsvp_sessions, public.rate_limits from anon, authenticated;
grant all on table public.households, public.guests, public.rsvps, public.admin_users, public.wedding_settings, public.rsvp_sessions, public.rate_limits to service_role;
revoke execute on function public.touch_updated_at(), public.check_plus_one_permission(), public.assert_identity_contacts(text,text), public.check_guest_identity_contacts(), public.check_household_identity_contacts(), public.open_invitation_session(text,text,text,text,timestamptz), public.invalidate_household_sessions(), public.check_rate_limit(text,integer,integer), public.resolve_invitation(text,text,text), public.public_invitation(uuid), public.submit_household_rsvp(text,jsonb,timestamptz), public.admin_save_guest(uuid,uuid,text,text,boolean,boolean), public.admin_delete_guest(uuid), public.admin_save_rsvp(uuid,boolean,text), public.admin_all_households(), public.admin_import_guests(jsonb,boolean) from public, anon, authenticated;
grant execute on function public.touch_updated_at(), public.check_plus_one_permission(), public.assert_identity_contacts(text,text), public.check_guest_identity_contacts(), public.check_household_identity_contacts(), public.open_invitation_session(text,text,text,text,timestamptz), public.invalidate_household_sessions(), public.check_rate_limit(text,integer,integer), public.resolve_invitation(text,text,text), public.public_invitation(uuid), public.submit_household_rsvp(text,jsonb,timestamptz), public.admin_save_guest(uuid,uuid,text,text,boolean,boolean), public.admin_delete_guest(uuid), public.admin_save_rsvp(uuid,boolean,text), public.admin_all_households(), public.admin_import_guests(jsonb,boolean) to service_role;

commit;
