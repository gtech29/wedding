import {
  beforeAll,
  beforeEach,
  afterAll,
  describe,
  expect,
  test,
} from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFile } from "node:fs/promises";

let db: PGlite;
const token = "a".repeat(64);
async function scalar<T>(sql: string, parameters: unknown[] = []): Promise<T> {
  const { rows } = await db.query<Record<string, T>>(sql, parameters);
  return Object.values(rows[0])[0];
}
async function household(
  name = "Test household",
  email = "invited@example.com",
  phone = "+52 646 123 4567",
) {
  return scalar<string>(
    "insert into households(display_name,primary_email,primary_phone) values($1,$2,$3) returning id",
    [name, email || null, phone || null],
  );
}
async function guest(
  houseId: string,
  first = "Test",
  last = "Invitee",
  plus = false,
) {
  return scalar<string>("select admin_save_guest(null,$1,$2,$3,$4,true)", [
    houseId,
    first,
    last,
    plus,
  ]);
}
async function session(
  houseId: string,
  hash = token,
  expires = "2099-01-01T00:00:00Z",
) {
  await db.query(
    "insert into rsvp_sessions(token_hash,household_id,expires_at) values($1,$2,$3)",
    [hash, houseId, expires],
  );
}
async function submit(
  responses: unknown[],
  hash = token,
  deadline: string | null = null,
) {
  return db.query(
    "select submit_household_rsvp($1,$2::jsonb,$3::timestamptz)",
    [hash, JSON.stringify(responses), deadline],
  );
}

beforeAll(async () => {
  db = await PGlite.create({ extensions: { pgcrypto } });
  await db.exec(
    "create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key);",
  );
  await db.exec(
    await readFile("supabase/migrations/202610050001_wedding.sql", "utf8"),
  );
}, 30_000);
beforeEach(async () => {
  await db.exec(
    "truncate households, guests, rsvps, rsvp_sessions, rate_limits, admin_users cascade; update wedding_settings set rsvp_deadline = null;",
  );
});
afterAll(async () => {
  await db?.close();
});

describe("database privacy and identity", () => {
  test("identity, private projection, and scoped session issuance share one transaction", async () => {
    const h = await household();
    await guest(h);
    const verified = await scalar<{
      status: string;
      household: { id: string };
    }>("select open_invitation_session('Test','Invitee',null,$1,null)", [
      token,
    ]);
    expect(verified.status).toBe("verified");
    expect(verified.household.id).toBe(h);
    expect(
      await scalar(
        "select household_id from rsvp_sessions where token_hash = $1",
        [token],
      ),
    ).toBe(h);
    const unknown = await scalar(
      "select open_invitation_session('Unknown','Nobody',null,$1,null)",
      ["b".repeat(64)],
    );
    const other = await household("Other", "other@example.com");
    await guest(other);
    const duplicate = await scalar(
      "select open_invitation_session('Test','Invitee',null,$1,null)",
      ["c".repeat(64)],
    );
    expect(unknown).toEqual({ status: "verification_required" });
    expect(duplicate).toEqual(unknown);
    expect(await scalar("select count(*)::int from rsvp_sessions")).toBe(1);
    await db.query(
      "update households set primary_phone = '+52 646 999 9999' where id = $1",
      [h],
    );
    expect(await scalar("select count(*)::int from rsvp_sessions")).toBe(0);
  });
  test("private tables enable RLS and deny anon/authenticated table and RPC access", async () => {
    for (const role of ["anon", "authenticated"]) {
      for (const table of [
        "households",
        "guests",
        "rsvps",
        "admin_users",
        "rsvp_sessions",
        "rate_limits",
        "wedding_settings",
      ]) {
        expect(
          await scalar<boolean>(
            "select relrowsecurity from pg_class where oid = $1::regclass",
            [`public.${table}`],
          ),
        ).toBe(true);
        expect(
          await scalar<boolean>(
            "select has_table_privilege($1,$2,'SELECT,INSERT,UPDATE,DELETE')",
            [role, `public.${table}`],
          ),
        ).toBe(false);
      }
      expect(
        await scalar<boolean>(
          "select has_function_privilege($1,'public.resolve_invitation(text,text,text)','execute')",
          [role],
        ),
      ).toBe(false);
      expect(
        await scalar<boolean>(
          "select has_function_privilege($1,'public.submit_household_rsvp(text,jsonb,timestamp with time zone)','execute')",
          [role],
        ),
      ).toBe(false);
    }
    expect(
      await scalar<boolean>(
        "select has_function_privilege('service_role','public.resolve_invitation(text,text,text)','execute')",
      ),
    ).toBe(true);
  });
  test("lookup only trims and folds case; accents, partial matches, and slots cannot identify a household", async () => {
    const h = await household();
    await guest(h, "José", "García", true);
    expect(
      await scalar("select resolve_invitation('  JOSÉ ', ' GARCÍA ', null)"),
    ).toBe(h);
    expect(
      await scalar("select resolve_invitation('Jose', 'Garcia', null)"),
    ).toBeNull();
    expect(
      await scalar("select resolve_invitation('Jos', 'García', null)"),
    ).toBeNull();
    expect(await scalar("select resolve_invitation('', '', null)")).toBeNull();
  });
  test("unknown and duplicate names return identical null until full stored contact verifies", async () => {
    const a = await household("A", "a@example.com", "+52 646 111 1111");
    const b = await household("B", "b@example.com", "+52 646 222 2222");
    await guest(a);
    await guest(b);
    expect(
      await scalar("select resolve_invitation('Test','Invitee',null)"),
    ).toBeNull();
    expect(
      await scalar("select resolve_invitation('Unknown','Nobody',null)"),
    ).toBeNull();
    expect(
      await scalar("select resolve_invitation('Test','Invitee','1111')"),
    ).toBeNull();
    expect(
      await scalar(
        "select resolve_invitation('Test','Invitee','invalid@example.com')",
      ),
    ).toBeNull();
    expect(
      await scalar(
        "select resolve_invitation('Test','Invitee',' A@EXAMPLE.COM ')",
      ),
    ).toBe(a);
    expect(
      await scalar(
        "select resolve_invitation('Test','Invitee','+52 (646) 222-2222')",
      ),
    ).toBe(b);
  });
  test("public invitation contains only permitted identity and RSVP fields", async () => {
    const h = await household();
    await guest(h);
    const invitation = await scalar<Record<string, unknown>>(
      "select public_invitation($1)",
      [h],
    );
    expect(Object.keys(invitation).sort()).toEqual([
      "display_name",
      "guests",
      "id",
    ]);
    expect(JSON.stringify(invitation)).not.toContain("invited@example.com");
    expect(JSON.stringify(invitation)).not.toContain("primary_phone");
  });
  test("the shared database rate counter enforces limits across calls", async () => {
    expect(await scalar("select check_rate_limit($1,2,900)", [token])).toBe(
      true,
    );
    expect(await scalar("select check_rate_limit($1,2,900)", [token])).toBe(
      true,
    );
    expect(await scalar("select check_rate_limit($1,2,900)", [token])).toBe(
      false,
    );
  });
});

describe("atomic RSVP authorization", () => {
  test("an unknown guest ID rolls back all responses and does not consume the session", async () => {
    const h = await household();
    const first = await guest(h);
    await guest(h, "Other");
    await session(h);
    await expect(
      submit([
        { guestId: first, attending: true },
        { guestId: "00000000-0000-4000-8000-000000000000", attending: true },
      ]),
    ).rejects.toThrow("RSVP_INVALID");
    expect(await scalar("select count(*)::int from rsvps")).toBe(0);
    expect(await scalar("select consumed_at from rsvp_sessions")).toBeNull();
  });
  test("duplicate guest IDs, missing guests, and cross-household IDs fail", async () => {
    const a = await household("A");
    const b = await household("B", "b@example.com");
    const first = await guest(a);
    const second = await guest(a, "Other");
    const outsider = await guest(b);
    await session(a);
    await expect(submit([{ guestId: first, attending: true }])).rejects.toThrow(
      "RSVP_INVALID",
    );
    await expect(
      submit([
        { guestId: first, attending: true },
        { guestId: first, attending: true },
      ]),
    ).rejects.toThrow("RSVP_INVALID");
    await expect(
      submit([
        { guestId: second, attending: true },
        { guestId: outsider, attending: true },
      ]),
    ).rejects.toThrow("RSVP_INVALID");
  });
  test("approved plus-one slots require adult confirmation, names, and attending sponsor", async () => {
    const h = await household();
    const sponsor = await guest(h, "Test", "Invitee", true);
    const slot = await scalar<string>(
      "select id from guests where sponsor_guest_id = $1",
      [sponsor],
    );
    await session(h);
    await expect(
      submit([
        { guestId: sponsor, attending: true },
        {
          guestId: slot,
          attending: true,
          firstName: "Adult",
          lastName: "Guest",
        },
      ]),
    ).rejects.toThrow("RSVP_INVALID");
    await expect(
      submit([
        { guestId: sponsor, attending: false },
        {
          guestId: slot,
          attending: true,
          firstName: "Adult",
          lastName: "Guest",
          adultConfirmed: true,
        },
      ]),
    ).rejects.toThrow("RSVP_INVALID");
    await submit([
      { guestId: sponsor, attending: true },
      {
        guestId: slot,
        attending: true,
        firstName: "Adult",
        lastName: "Guest",
        adultConfirmed: true,
        dietaryRestrictions: "Nut allergy",
      },
    ]);
    expect(
      await scalar("select first_name from guests where id = $1", [slot]),
    ).toBe("Adult");
    expect(
      await scalar("select count(*)::int from rsvps where attending"),
    ).toBe(2);
  });
  test("successful submission consumes every household session and preserves created_at when editing after re-verification", async () => {
    const h = await household();
    const id = await guest(h);
    await session(h);
    await session(h, "b".repeat(64));
    await submit([
      { guestId: id, attending: true, dietaryRestrictions: "Vegan" },
    ]);
    const created = await scalar<Date>("select created_at from rsvps");
    await expect(submit([{ guestId: id, attending: false }])).rejects.toThrow(
      "RSVP_EXPIRED",
    );
    await expect(
      submit([{ guestId: id, attending: false }], "b".repeat(64)),
    ).rejects.toThrow("RSVP_EXPIRED");
    await session(h, "c".repeat(64));
    await submit([{ guestId: id, attending: false }], "c".repeat(64));
    expect(await scalar("select created_at from rsvps")).toEqual(created);
    expect(await scalar("select attending from rsvps")).toBe(false);
  });
  test("expired sessions, server deadlines, and database deadlines reject atomically", async () => {
    const h = await household();
    const id = await guest(h);
    await session(h, token, "2000-01-01T00:00:00Z");
    await expect(submit([{ guestId: id, attending: true }])).rejects.toThrow(
      "RSVP_EXPIRED",
    );
    await session(h, "b".repeat(64));
    await expect(
      submit(
        [{ guestId: id, attending: true }],
        "b".repeat(64),
        "2000-01-01T00:00:00Z",
      ),
    ).rejects.toThrow("RSVP_CLOSED");
    await db.exec("update wedding_settings set rsvp_deadline = '2000-01-01';");
    await expect(
      submit([{ guestId: id, attending: true }], "b".repeat(64)),
    ).rejects.toThrow("RSVP_CLOSED");
    expect(await scalar("select count(*)::int from rsvps")).toBe(0);
  });
});

describe("administration transactions", () => {
  test("table constraints prevent orphaned or missing plus-one slots even outside the management RPC", async () => {
    const h = await household();
    const sponsor = await guest(h, "Test", "Invitee", true);
    await expect(
      db.query("update guests set plus_one_allowed = false where id = $1", [
        sponsor,
      ]),
    ).rejects.toThrow("INVALID_PLUS_ONE");
    await expect(
      db.query("delete from guests where sponsor_guest_id = $1", [sponsor]),
    ).rejects.toThrow("INVALID_PLUS_ONE");
    await expect(
      db.query(
        "update guests set is_plus_one = false, sponsor_guest_id = null, first_name = 'New', last_name = 'Guest' where sponsor_guest_id = $1",
        [sponsor],
      ),
    ).rejects.toThrow("INVALID_PLUS_ONE");
    await db.query("select admin_delete_guest($1)", [sponsor]);
    expect(await scalar("select count(*)::int from guests")).toBe(0);
  });
  test("duplicate identities require independently distinguishing contacts and contact edits cannot strand a guest", async () => {
    const a = await household("A", "same@example.com", ""),
      b = await household("B", "same@example.com", "");
    await guest(a);
    await expect(guest(b)).rejects.toThrow(
      "DUPLICATE_NAME_REQUIRES_DISTINCT_CONTACT",
    );
    await db.query(
      "update households set primary_email = 'other@example.com' where id = $1",
      [b],
    );
    await guest(b);
    await expect(
      db.query("update households set primary_email = null where id = $1", [a]),
    ).rejects.toThrow("DUPLICATE_NAME_REQUIRES_DISTINCT_CONTACT");
    expect(
      await scalar(
        "select resolve_invitation('Test','Invitee','same@example.com')",
      ),
    ).toBe(a);
  });
  test("adding non-adults fails, approved slots move with sponsors, and revoking permission removes the slot", async () => {
    const a = await household("A"),
      b = await household("B");
    await expect(
      db.query(
        "select admin_save_guest(null,$1,'Test','Invitee',false,false)",
        [a],
      ),
    ).rejects.toThrow("INVALID_GUEST");
    const id = await guest(a, "Test", "Invitee", true);
    await db.query(
      "select admin_save_guest($1,$2,'Test','Invitee',true,true)",
      [id, b],
    );
    expect(
      await scalar("select count(*)::int from guests where household_id = $1", [
        b,
      ]),
    ).toBe(2);
    await db.query(
      "select admin_save_guest($1,$2,'Test','Invitee',false,true)",
      [id, b],
    );
    expect(
      await scalar("select count(*)::int from guests where household_id = $1", [
        b,
      ]),
    ).toBe(1);
  });
  test("import is all-or-nothing on duplicate guests", async () => {
    const rows = [
      {
        firstName: "Test",
        lastName: "Invitee",
        household: "Import",
        email: "i@example.com",
        phone: "",
        plusOneAllowed: false,
      },
      {
        firstName: "Test",
        lastName: "Invitee",
        household: "Import",
        email: "i@example.com",
        phone: "",
        plusOneAllowed: false,
      },
    ];
    await expect(
      db.query("select admin_import_guests($1,true)", [JSON.stringify(rows)]),
    ).rejects.toThrow("DUPLICATE_GUEST");
    expect(await scalar("select count(*)::int from households")).toBe(0);
    expect(await scalar("select count(*)::int from guests")).toBe(0);
  });
  test("valid import creates household guests and only explicitly permitted slots", async () => {
    const rows = [
      {
        firstName: "First",
        lastName: "Invitee",
        household: "Import",
        email: "i@example.com",
        phone: "",
        plusOneAllowed: true,
      },
      {
        firstName: "Second",
        lastName: "Invitee",
        household: "Import",
        email: "i@example.com",
        phone: "",
        plusOneAllowed: false,
      },
    ];
    expect(
      await scalar("select admin_import_guests($1,true)", [
        JSON.stringify(rows),
      ]),
    ).toBe(2);
    const data = await scalar<{ guests: unknown[] }[]>(
      "select admin_all_households()",
    );
    expect(data).toHaveLength(1);
    expect(data[0].guests).toHaveLength(3);
  });
  test("manual declines update a sponsor's slot and invalidate existing sessions", async () => {
    const h = await household();
    const id = await guest(h, "Test", "Invitee", true);
    await session(h);
    await db.query("select admin_save_rsvp($1,false,'')", [id]);
    expect(
      await scalar("select count(*)::int from rsvps where not attending"),
    ).toBe(2);
    expect(await scalar("select count(*)::int from rsvp_sessions")).toBe(0);
  });
});
