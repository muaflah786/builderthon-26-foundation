import { expect, test, type Page } from "@playwright/test";

const password = "correct-horse-battery";
const uniqueEmail = () =>
  `items-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

async function signUp(page: Page) {
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("Items User");
  await page.getByLabel("Email").fill(uniqueEmail());
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign up" }).click();
  await expect(page).toHaveURL(/\/app$/);
}

async function createItem(page: Page, title: string, status = "Open") {
  await page.goto("/app/items/new");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Status").selectOption({ label: status });
  await page.getByRole("button", { name: "Create item" }).click();
  await expect(page).toHaveURL(/\/app\/items\/[^/]+$/);
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
}

test("create → list → search → edit → delete", async ({ page }) => {
  await signUp(page);

  await page.goto("/app/items");
  await expect(page.getByText("No items yet")).toBeVisible();

  await createItem(page, "Alpha task");
  await createItem(page, "Beta task", "Done");

  await page.goto("/app/items");
  await expect(page.getByRole("link", { name: "Alpha task" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Beta task" })).toBeVisible();

  // Search + filter are URL-driven.
  await page.getByLabel("Search").fill("alpha");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page).toHaveURL(/q=alpha/);
  await expect(page.getByRole("link", { name: "Alpha task" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Beta task" })).toHaveCount(0);

  await page.goto("/app/items?q=zzz-nothing");
  await expect(page.getByText("No matching items")).toBeVisible();

  // Edit
  await page.goto("/app/items");
  await page.getByRole("link", { name: "Alpha task" }).click();
  await page.getByLabel("Title").fill("Alpha renamed");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Alpha renamed" })).toBeVisible();

  // Client-side validation error
  await page.getByLabel("Title").fill("");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Title is required")).toBeVisible();

  // Delete with confirmation
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("button", { name: "Delete item" }).click();
  await expect(page).toHaveURL(/\/app\/items$/);
  await expect(page.getByRole("link", { name: "Alpha renamed" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Beta task" })).toBeVisible();
});

test("another user's item is a 404", async ({ page, browser }) => {
  await signUp(page);
  await createItem(page, "Secret item");
  const url = page.url();

  const other = await browser.newPage();
  await signUp(other);
  // The root loading.tsx streams the response, so notFound() keeps HTTP 200 but
  // renders the not-found UI (Next 16 behaviour). The API returns a real 404.
  await other.goto(url);
  const api = await other.request.get(`/api/items/${url.split("/").pop()}`);
  expect(api.status()).toBe(404);
  await expect(other.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();
  await expect(other.getByText("Secret item")).toHaveCount(0);
  await other.close();
});

test("search and filters work without JavaScript", async ({ page, browser }) => {
  await signUp(page);
  await createItem(page, "Nojs findme");
  await createItem(page, "Other entry");
  const cookies = await page.context().cookies();

  const ctx = await browser.newContext({ javaScriptEnabled: false });
  await ctx.addCookies(cookies);
  const nojs = await ctx.newPage();
  await nojs.goto("/app/items");
  await nojs.getByLabel("Search").fill("findme");
  await nojs.getByRole("button", { name: "Apply" }).click();
  await expect(nojs).toHaveURL(/q=findme/);
  await expect(nojs.getByRole("link", { name: "Nojs findme" })).toBeVisible();
  await expect(nojs.getByRole("link", { name: "Other entry" })).toHaveCount(0);
  await ctx.close();
});
