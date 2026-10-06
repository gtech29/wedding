import { expect, test } from "@playwright/test";

test("unauthenticated callers cannot read admin data or export guest records", async ({
  request,
}) => {
  for (const path of ["/api/admin/data", "/api/admin/export"]) {
    const response = await request.get(path);
    expect([401, 403, 503], path).toContain(response.status());
    expect(response.headers()["cache-control"]).toContain("no-store");
    const body = await response.json();
    expect(body).not.toHaveProperty("households");
    expect(body).not.toHaveProperty("guests");
    expect(body).not.toHaveProperty("rsvps");
    expect(JSON.stringify(body)).not.toMatch(
      /service_role|postgres|supabase_service_role_key/i,
    );
  }
});

test("cross-origin RSVP and admin mutations are rejected before processing", async ({
  request,
}) => {
  for (const path of [
    "/api/rsvp/lookup",
    "/api/admin/login",
    "/api/admin/import",
  ]) {
    const response = await request.post(path, {
      headers: {
        Origin: "https://untrusted.example",
        "Sec-Fetch-Site": "cross-site",
      },
      data: { firstName: "Synthetic", lastName: "Noninvitee" },
    });
    expect(response.status(), path).toBe(403);
    const body = await response.json();
    expect(body).not.toHaveProperty("guests");
    expect(body).not.toHaveProperty("household");
    expect(response.headers()["cache-control"]).toContain("no-store");
  }
});

test("lookup accepts no blank identity and produces no invitation or verification hints", async ({
  request,
  baseURL,
}) => {
  const response = await request.post("/api/rsvp/lookup", {
    headers: { Origin: new URL(baseURL!).origin },
    data: { firstName: "", lastName: "" },
  });
  expect(response.status()).toBe(400);
  const body = await response.json();
  expect(body).not.toHaveProperty("household");
  expect(body).not.toHaveProperty("guests");
  expect(body).not.toHaveProperty("email");
  expect(body).not.toHaveProperty("phone");
  expect(response.headers()["cache-control"]).toContain("no-store");
});

test("the locale API rejects unsupported locales and cross-origin changes", async ({
  request,
  baseURL,
}) => {
  const invalid = await request.post("/api/locale", {
    headers: { Origin: new URL(baseURL!).origin },
    data: { locale: "es-ES" },
  });
  expect(invalid.status()).toBe(400);
  const crossOrigin = await request.post("/api/locale", {
    headers: { Origin: "https://untrusted.example" },
    data: { locale: "es-MX" },
  });
  expect(crossOrigin.status()).toBe(403);
  expect(crossOrigin.headers()["set-cookie"]).toBeUndefined();
});

test("a crafted RSVP cannot be submitted without a verified invitation session", async ({
  request,
  baseURL,
}) => {
  const response = await request.post("/api/rsvp/submit", {
    headers: { Origin: new URL(baseURL!).origin },
    data: {
      responses: [
        {
          guestId: "3c35824f-2a8e-4ac3-9b5d-fd4c2bd304d8",
          attending: true,
          dietaryRestrictions: "",
        },
      ],
    },
  });
  expect(response.status()).toBe(401);
  const body = await response.json();
  expect(body.code).toBe("expired");
  expect(body).not.toHaveProperty("household");
  expect(body).not.toHaveProperty("guests");
  expect(response.headers()["cache-control"]).toContain("no-store");
});
