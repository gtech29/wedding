import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Fixtures exist only in intercepted browser tests. The application has no demo data or authentication bypass.
function adminFixture() {
  const timestamp = "2026-10-05T12:00:00Z";
  const guest = (
    id: string,
    first: string,
    household: string,
    response: boolean | null,
    plus = false,
  ) => ({
    id,
    first_name: first,
    last_name: "Example",
    household_id: household,
    plus_one_allowed: plus,
    is_plus_one: false,
    sponsor_guest_id: null,
    adult_confirmed: true,
    created_at: timestamp,
    updated_at: timestamp,
    rsvp:
      response === null
        ? null
        : {
            id: "rsvp-1",
            guest_id: id,
            attending: response,
            dietary_restrictions: response ? "Nut allergy" : "",
            created_at: timestamp,
            submitted_at: timestamp,
            updated_at: timestamp,
          },
  });
  return {
    deadline: "2027-07-27T23:59:59-07:00",
    households: [
      {
        id: "house-a",
        display_name: "Example household A",
        primary_email: "fixture-a@example.test",
        primary_phone: "+15555550111",
        created_at: timestamp,
        updated_at: timestamp,
        guests: [
          guest("guest-a", "Avery", "house-a", true, true),
          guest("guest-b", "Taylor", "house-a", false),
        ],
      },
      {
        id: "house-b",
        display_name: "Example household B",
        primary_email: "fixture-b@example.test",
        primary_phone: "+15555550222",
        created_at: timestamp,
        updated_at: timestamp,
        guests: [guest("guest-c", "Morgan", "house-b", null)],
      },
    ],
  };
}

async function authenticatedFixture(page: Page) {
  await page.route("**/api/admin/data", (route) =>
    route.fulfill({ json: adminFixture() }),
  );
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "The celebration, at a glance." }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(page.viewportSize()!.width);
}

test("authenticated management views and forms have accessible contrast", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "Shared admin text colors are checked once; responsive interaction tests run at every viewport.",
  );
  await authenticatedFixture(page);
  const check = async () => {
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(result.violations).toEqual([]);
  };
  await check();
  await page
    .getByRole("button", { name: "Edit Avery Example", exact: true })
    .click();
  await check();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.getByRole("button", { name: "Households", exact: true }).click();
  await check();
  await page
    .getByRole("button", { name: "Import guests", exact: true })
    .click();
  await check();
});

test("admin shows a private sign-in screen for an unauthorized session", async ({
  page,
}) => {
  await page.route("**/api/admin/data", (route) =>
    route.fulfill({ status: 401, json: { error: "Sign in to continue." } }),
  );
  await page.goto("/admin");
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Wedding administration" }),
  ).toHaveCount(0);
  expect(
    await page.locator('meta[name="robots"]').getAttribute("content"),
  ).toContain("noindex");
});

test("admin filters guests and isolates wholly unanswered households", async ({
  page,
}) => {
  await authenticatedFixture(page);
  await page.getByRole("button", { name: "Guest list", exact: true }).click();
  await expect(
    page.getByRole("cell", {
      name: "Avery Example Plus one allowed",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "No response", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "Morgan Example", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", {
      name: "Avery Example Plus one allowed",
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Plus one allowed", exact: true })
    .click();
  await expect(
    page.getByRole("cell", {
      name: "Avery Example Plus one allowed",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "Morgan Example", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: /^Unanswered/ }).click();
  await expect(
    page.getByRole("heading", { name: "Example household B" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Example household A" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "fixture-b@example.test" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
});

test("admin guest editing preserves adult confirmation and moves the invitation explicitly", async ({
  page,
}) => {
  let submitted: Record<string, unknown> | null = null;
  await page.route("**/api/admin/guests", async (route) => {
    submitted = route.request().postDataJSON();
    await route.fulfill({ json: { ok: true } });
  });
  await authenticatedFixture(page);
  await page
    .getByRole("button", { name: "Edit Avery Example", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Household", { exact: true }).selectOption("house-b");
  await expect(
    dialog.getByLabel("I confirm this invited guest is an adult."),
  ).toBeChecked();
  await dialog.getByRole("button", { name: "Save guest", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(submitted).toEqual({
    id: "guest-a",
    firstName: "Avery",
    lastName: "Example",
    householdId: "house-b",
    plusOneAllowed: true,
    adultConfirmed: true,
  });
});

test("CSV import requires validated preview and explicit adult confirmation", async ({
  page,
}) => {
  const requests: {
    csv: string;
    confirm: boolean;
    adultConfirmed?: boolean;
  }[] = [];
  const csv =
    "First Name,Last Name,Household,Email,Phone,Plus One Allowed\nJordan,Example,Example C,,,false";
  await page.route("**/api/admin/import", async (route) => {
    const body = route.request().postDataJSON();
    requests.push(body);
    await route.fulfill({
      json: body.confirm
        ? { ok: true, imported: 1 }
        : {
            rows: [
              {
                firstName: "Jordan",
                lastName: "Example",
                household: "Example C",
                email: "",
                phone: "",
                plusOneAllowed: false,
              },
            ],
            errors: [],
            warnings: [],
            valid: true,
          },
    });
  });
  await authenticatedFixture(page);
  await page
    .getByRole("button", { name: "Import guests", exact: true })
    .click();
  await page.getByText("Or paste CSV content").click();
  await page.getByLabel("Guest list CSV content").fill(csv);
  await page
    .getByRole("button", { name: "Validate & preview", exact: true })
    .click();
  const confirm = page.getByRole("button", {
    name: "Confirm import of 1 guest",
    exact: true,
  });
  await expect(confirm).toBeDisabled();
  await expect(
    page.getByRole("cell", { name: "Jordan Example" }),
  ).toBeVisible();
  expect(requests).toHaveLength(1);
  await page
    .getByLabel("I confirm everyone on this guest list is an invited adult.")
    .check();
  await confirm.click();
  await expect(page.getByRole("status")).toHaveText(
    "1 guest imported successfully.",
  );
  expect(requests).toEqual([
    { csv, confirm: false },
    { csv, confirm: true, adultConfirmed: true },
  ]);
});
