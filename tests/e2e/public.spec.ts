import { expect, test } from "@playwright/test";

const publicPaths = [
  "/",
  "/our-story",
  "/things-to-do",
  "/travel",
  "/faq",
  "/honeymoon-fund",
  "/gallery",
  "/rsvp",
];

test("every public page renders with a title, a single main heading, and no horizontal overflow", async ({
  page,
}) => {
  test.setTimeout(120_000);
  for (const path of publicPaths) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page).toHaveTitle(/Sarah and Juan/);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(overflow, `${path} should fit the viewport`).toBe(false);
  }
});

test("the homepage displays confirmed details and a clear route to RSVP", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Sarah");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Juan");
  await expect(page.getByText("August 27, 2027").first()).toBeVisible();
  const action = page.locator('main a[href="/rsvp"]').first();
  await expect(action).toBeVisible();
  await action.click();
  await expect(page).toHaveURL(/\/rsvp$/);
  await expect(page.getByLabel("First name", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Last name", { exact: true })).toBeVisible();
});

test("the Mexican Spanish choice persists through navigation and reload", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Español", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "es-MX");
  await expect(page.getByText("27 de agosto de 2027").first()).toBeVisible();
  await page.goto("/rsvp");
  await expect(page.getByLabel("Nombre", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Apellido", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "es-MX");
  expect(
    (await context.cookies()).find((cookie) => cookie.name === "wedding-locale")
      ?.value,
  ).toBe("es-MX");
  await page.getByRole("button", { name: "English", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByLabel("First name", { exact: true })).toBeVisible();
});

test("the FAQ can be expanded and closed using the keyboard", async ({
  page,
}) => {
  await page.goto("/faq");
  const question = page.getByText("Are children invited?", { exact: true });
  await question.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByText(/Our wedding will be an adults-only celebration/),
  ).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(
    page.getByText(/Our wedding will be an adults-only celebration/),
  ).not.toBeVisible();
});

test("the gallery and travel pages label missing content without fabricated details", async ({
  page,
}) => {
  await page.goto("/gallery");
  await expect(
    page.getByText("Our engagement photographs will be here soon.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator("main")).toContainText("Photograph to come");
  await page.goto("/travel");
  await expect(page.locator("main")).toContainText("Siempre Valle");
  await expect(page.locator("main")).toContainText(
    "We’ll share these details soon.",
  );
  await page.goto("/honeymoon-fund");
  await expect(
    page.getByText("Honeymoon fund details to come.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('input[type="number"], input[autocomplete="cc-number"]'),
  ).toHaveCount(0);
});

test("private pages are excluded from search indexing and never render a guest directory", async ({
  page,
}) => {
  for (const path of ["/rsvp", "/admin"]) {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      /noindex/,
    );
    await expect(page.locator("table")).toHaveCount(0);
  }
});

test("recovery explains a safe next step without soliciting a new contact address", async ({
  page,
}) => {
  await page.goto("/rsvp");
  await page
    .getByRole("button", { name: "Can’t find your invitation?", exact: true })
    .click();
  await expect(
    page.getByText(
      "We couldn’t locate your invitation. Please contact Sarah or Juan for assistance.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.locator('input[type="email"]')).toHaveCount(0);
  await expect(page.getByRole("listbox")).toHaveCount(0);
});

test("required RSVP name fields use native validation before any lookup", async ({
  page,
}) => {
  let lookupCount = 0;
  page.on("request", (request) => {
    if (request.url().includes("/api/rsvp/lookup")) lookupCount++;
  });
  await page.goto("/rsvp");
  await page
    .getByRole("button", { name: "Find my invitation", exact: true })
    .click();
  expect(lookupCount).toBe(0);
  await expect(page.getByLabel("First name", { exact: true })).toBeFocused();
  await expect(page.getByRole("listbox")).toHaveCount(0);
});

test("navigation supports the keyboard and returns mobile focus after Escape", async ({
  page,
}) => {
  await page.goto("/");
  const menu = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  if (await menu.isVisible()) {
    await menu.focus();
    await page.keyboard.press("Enter");
    const navigation = page.getByRole("navigation", {
      name: "Mobile navigation",
      exact: true,
    });
    await expect(navigation).toBeVisible();
    await navigation.getByRole("link", { name: /Our story/ }).focus();
    await page.keyboard.press("Escape");
    await expect(navigation).toHaveCount(0);
    await expect(menu).toBeFocused();
    await page.keyboard.press("Enter");
    await navigation.getByRole("link", { name: /Gallery/ }).click();
    await expect(page).toHaveURL(/\/gallery$/);
    await expect(navigation).toHaveCount(0);
  } else {
    await page
      .getByRole("navigation", { name: "Main navigation", exact: true })
      .getByRole("link", { name: "Gallery", exact: true })
      .focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/gallery$/);
  }
});
