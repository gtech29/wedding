import { expect, test, type Page } from "@playwright/test";

// Synthetic network fixtures exercise the UI only. They are never seeded or accepted by the real backend.
const adultId = "3c35824f-2a8e-4ac3-9b5d-fd4c2bd304d8";
const plusId = "7c836aa6-2b89-4011-aec8-faf3bf879273";
function invitation(plusOneAllowed = false) {
  const adult = {
    id: adultId,
    first_name: "Test",
    last_name: "Adult",
    plus_one_allowed: plusOneAllowed,
    is_plus_one: false,
    sponsor_guest_id: null,
    rsvp: null,
  };
  const plus = {
    id: plusId,
    first_name: "",
    last_name: "",
    plus_one_allowed: false,
    is_plus_one: true,
    sponsor_guest_id: adultId,
    rsvp: null,
  };
  return {
    id: "0f93339b-1832-4b68-b871-2a2a872354d9",
    display_name: "Synthetic test invitation",
    guests: plusOneAllowed ? [adult, plus] : [adult],
  };
}

async function identify(page: Page, plusOneAllowed = false) {
  await page.route("**/api/rsvp/lookup", (route) =>
    route.fulfill({
      json: {
        status: "verified",
        household: invitation(plusOneAllowed),
        deadline: null,
      },
    }),
  );
  await page.goto("/rsvp");
  await page.getByLabel("First name", { exact: true }).fill("Test");
  await page.getByLabel("Last name", { exact: true }).fill("Adult");
  await page
    .getByRole("button", { name: "Find my invitation", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Synthetic test invitation",
      exact: true,
    }),
  ).toBeVisible();
}

test("verified adults can respond, review dietary notes, and must verify again to edit", async ({
  page,
}) => {
  let submitted: unknown;
  await page.route("**/api/rsvp/submit", (route) => {
    submitted = route.request().postDataJSON();
    return route.fulfill({ json: { ok: true } });
  });
  await page.route("**/api/rsvp/reset", (route) =>
    route.fulfill({ json: { ok: true } }),
  );
  await identify(page);
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await expect(page.getByText("Invited plus-one", { exact: true })).toHaveCount(
    0,
  );
  await page
    .getByRole("radio", { name: "Yes, happily attending", exact: true })
    .check();
  await page
    .getByLabel("Dietary restrictions", { exact: false })
    .fill("Synthetic note: no peanuts");
  await page
    .getByRole("button", { name: "Send our RSVP", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Thank you.", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("We can’t wait to celebrate with you.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Synthetic note: no peanuts", { exact: true }),
  ).toBeVisible();
  expect(submitted).toEqual({
    responses: [
      {
        guestId: adultId,
        attending: true,
        dietaryRestrictions: "Synthetic note: no peanuts",
      },
    ],
  });
  await page
    .getByRole("button", { name: "Change your response", exact: true })
    .click();
  await expect(page.getByLabel("First name", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Synthetic test invitation",
      exact: true,
    }),
  ).toHaveCount(0);
});

test("an approved plus one requires a name and adult confirmation and uses the reserved guest ID", async ({
  page,
}) => {
  let submitted: { responses: Record<string, unknown>[] } | undefined;
  await page.route("**/api/rsvp/submit", (route) => {
    submitted = route.request().postDataJSON();
    return route.fulfill({ json: { ok: true } });
  });
  await identify(page, true);
  const adult = page.getByRole("group", { name: "Test Adult", exact: true });
  const plus = page.getByRole("group", {
    name: "Invited plus-one",
    exact: true,
  });
  await adult
    .getByRole("radio", { name: "Yes, happily attending", exact: true })
    .check();
  await plus
    .getByRole("radio", { name: "Yes, happily attending", exact: true })
    .check();
  await plus.getByLabel("First name", { exact: true }).fill("Fixture");
  await plus.getByLabel("Last name", { exact: true }).fill("Companion");
  await page
    .getByRole("button", { name: "Send our RSVP", exact: true })
    .click();
  expect(submitted).toBeUndefined();
  await plus
    .getByRole("checkbox", { name: "My plus-one is an adult.", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Send our RSVP", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Thank you.", exact: true }),
  ).toBeVisible();
  expect(submitted?.responses).toHaveLength(2);
  expect(submitted?.responses[1]).toEqual({
    guestId: plusId,
    attending: true,
    dietaryRestrictions: "",
    firstName: "Fixture",
    lastName: "Companion",
    adultConfirmed: true,
  });
});

test("a fully declined invitation receives the appropriate warm confirmation", async ({
  page,
}) => {
  await page.route("**/api/rsvp/submit", (route) =>
    route.fulfill({ json: { ok: true } }),
  );
  await identify(page);
  await page
    .getByRole("radio", { name: "No, unable to attend", exact: true })
    .check();
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Send our RSVP", exact: true })
    .click();
  await expect(
    page.getByText("You’ll be missed. Thank you for letting us know.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("We can’t wait to celebrate with you.", { exact: true }),
  ).toHaveCount(0);
});

test("secondary verification displays no guest options and uses one generic failure", async ({
  page,
}) => {
  await page.route("**/api/rsvp/lookup", (route) =>
    route.fulfill({ json: { status: "verification_required" } }),
  );
  await page.goto("/rsvp");
  await page.getByLabel("First name", { exact: true }).fill("Synthetic");
  await page.getByLabel("Last name", { exact: true }).fill("Unresolved");
  await page
    .getByRole("button", { name: "Find my invitation", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "One more detail", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await page
    .getByLabel("Email address or phone number", { exact: true })
    .fill("synthetic@example.invalid");
  await page
    .getByRole("button", { name: "Verify invitation", exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "We couldn’t locate an invitation with that information.",
  );
  await expect(
    page.getByRole("heading", { name: "A seat for each of you.", exact: true }),
  ).toHaveCount(0);
});

test("an expired session removes the household and requests verification again", async ({
  page,
}) => {
  await page.route("**/api/rsvp/submit", (route) =>
    route.fulfill({
      status: 401,
      json: { code: "expired", error: "Please verify your invitation again." },
    }),
  );
  await identify(page);
  await page
    .getByRole("radio", { name: "Yes, happily attending", exact: true })
    .check();
  await page
    .getByRole("button", { name: "Send our RSVP", exact: true })
    .click();
  await expect(page.getByLabel("First name", { exact: true })).toBeVisible();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "Please find your invitation again before making changes.",
  );
  await expect(
    page.getByRole("heading", {
      name: "Synthetic test invitation",
      exact: true,
    }),
  ).toHaveCount(0);
});

test("a lookup service failure is announced in Mexican Spanish without exposing server detail", async ({
  page,
}) => {
  await page.route("**/api/rsvp/lookup", (route) =>
    route.fulfill({
      status: 503,
      json: {
        code: "unavailable",
        error: "Synthetic internal database diagnostic must never appear",
      },
    }),
  );
  await page.goto("/rsvp");
  await page.getByRole("button", { name: "Español", exact: true }).click();
  await expect(page.getByLabel("Nombre", { exact: true })).toBeVisible();
  await page.getByLabel("Nombre", { exact: true }).fill("Test");
  await page.getByLabel("Apellido", { exact: true }).fill("Adult");
  await page
    .getByRole("button", { name: "Encontrar mi invitación", exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "La confirmación de asistencia aún no está disponible. Vuelve pronto o comunícate con Sarah o Juan.",
  );
  await expect(page.locator("body")).not.toContainText(
    "Synthetic internal database diagnostic",
  );
});
