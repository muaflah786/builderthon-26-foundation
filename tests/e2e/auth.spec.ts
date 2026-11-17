import { expect, test } from "@playwright/test";

/**
 * Auth critical flows. Needs T4's playwright.config.ts (baseURL + webServer).
 * Each run uses a fresh email so it is safe to repeat against the same local.db.
 * `/app` itself is created by the coordinator; before that it may render a 404,
 * so these tests assert on the URL and the session, not on /app content.
 */

const password = "correct-horse-battery";
const uniqueEmail = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

async function signUp(page: import("@playwright/test").Page, email: string) {
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("E2E User");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign up" }).click();
}

test("unauthenticated /app/* redirects to sign-in with next", async ({ page }) => {
  await page.goto("/app/anything");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fapp%2Fanything$/);
});

test("sign up lands on /app with a user session", async ({ page }) => {
  const email = uniqueEmail();
  await signUp(page, email);
  await expect(page).toHaveURL(/\/app$/);

  const res = await page.request.get("/api/auth/get-session");
  const body = await res.json();
  expect(body.user).toMatchObject({ email, role: "user" });

  // Signed-in users are bounced away from the auth pages.
  await page.goto("/sign-in");
  await expect(page).toHaveURL(/\/app$/);
});

test("duplicate email sign-up shows an error", async ({ page, browser }) => {
  const email = uniqueEmail();
  await signUp(page, email);
  await expect(page).toHaveURL(/\/app$/);

  const fresh = await browser.newPage();
  await signUp(fresh, email);
  await expect(fresh.getByRole("alert")).toBeVisible();
  await expect(fresh).toHaveURL(/\/sign-up/);
  await fresh.close();
});

test("wrong password shows an error; correct password follows next", async ({ page, browser }) => {
  const email = uniqueEmail();
  const setup = await browser.newPage();
  await signUp(setup, email);
  await expect(setup).toHaveURL(/\/app$/);
  await setup.close();

  await page.goto("/sign-in?next=%2Fapp%2Fsettings");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toBeVisible();

  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app\/settings$/);
});

test("an external next is ignored", async ({ page, browser }) => {
  const email = uniqueEmail();
  const setup = await browser.newPage();
  await signUp(setup, email);
  await setup.close();

  await page.goto("/sign-in?next=%2F%2Fevil.com");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/localhost:\d+\/app$/);
});

test("client-side validation blocks a short password", async ({ page }) => {
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("E2E User");
  await page.getByLabel("Email").fill(uniqueEmail());
  await page.getByLabel("Password").fill("short");
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page.getByText("Password must be at least 8 characters")).toBeVisible();
  await expect(page).toHaveURL(/\/sign-up/);
});

test("sign out clears the session", async ({ page }) => {
  await signUp(page, uniqueEmail());
  await expect(page).toHaveURL(/\/app$/);

  // The sign-out button lives in the app shell (wired at integration); use the API here.
  // Better Auth requires a JSON content type on POST; `data: {}` sets it.
  const out = await page.request.post("/api/auth/sign-out", {
    headers: { origin: new URL(page.url()).origin },
    data: {},
  });
  expect(out.ok()).toBe(true);
  const session = await (await page.request.get("/api/auth/get-session")).json();
  expect(session).toBeNull();

  await page.goto("/app/anything");
  await expect(page).toHaveURL(/\/sign-in\?next=/);
});
