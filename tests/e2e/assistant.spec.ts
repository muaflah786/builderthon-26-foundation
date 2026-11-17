import { expect, test, type Page, type Route } from "@playwright/test";

/**
 * Browser tests for the website assistant (T6).
 * The E2E server runs WITHOUT an AI provider (AI_PROVIDER is blank in
 * playwright.config.ts), so:
 * - "real backend" tests check the genuine not-configured path end to end;
 * - UI tests intercept /api/assistant/chat with a scripted NDJSON stream
 *   (deterministic; NOT evidence of model inference: see npm run assistant:smoke).
 */

type Captured = {
  siteId: string;
  message: string;
  history: unknown[];
  page?: Record<string, string>;
};

async function mockChat(page: Page, reply: (body: Captured, n: number) => string) {
  const bodies: Captured[] = [];
  await page.route("**/api/assistant/chat", async (route: Route) => {
    const body = route.request().postDataJSON() as Captured;
    bodies.push(body);
    const text = reply(body, bodies.length);
    const lines = [
      {
        type: "meta",
        provider: "ollama",
        model: "scripted",
        sources: [
          {
            id: "shipping-returns#returns-and-refunds",
            title: "Shipping & returns: Returns and refunds",
            url: "/demo/shipping-returns#returns-and-refunds",
          },
        ],
      },
      ...text.split(" ").map((w, i) => ({ type: "delta", text: (i ? " " : "") + w })),
      { type: "done" },
    ];
    await route.fulfill({
      status: 200,
      contentType: "application/x-ndjson",
      body: lines.map((l) => JSON.stringify(l)).join("\n") + "\n",
    });
  });
  return bodies;
}

const openChat = (page: Page) => page.getByRole("button", { name: "Chat with Mira" }).click();
const ask = async (page: Page, text: string) => {
  const box = page.getByLabel("Message Mira");
  await box.fill(text);
  await box.press("Enter");
};

test.describe("assistant UI (scripted stream)", () => {
  test("launcher, welcome, suggestions, streaming answer and sources", async ({ page }) => {
    const bodies = await mockChat(page, () => "Unopened products can be returned within 7 days.");
    await page.goto("/demo");
    await openChat(page);
    const dialog = page.getByRole("dialog", { name: "Mira chat" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("I'm Mira")).toBeVisible();
    await dialog.getByRole("button", { name: "What is your return policy?" }).click();
    await expect(
      dialog.getByText("Unopened products can be returned within 7 days."),
    ).toBeVisible();
    await expect(
      dialog.getByRole("link", { name: "Shipping & returns: Returns and refunds" }),
    ).toBeVisible();
    expect(bodies[0]).toMatchObject({
      siteId: "malabar-spice",
      message: "What is your return policy?",
    });
  });

  test("page context follows navigation and excludes nothing sensitive", async ({ page }) => {
    const bodies = await mockChat(page, () => "ok");
    await page.goto("/demo/products/black-pepper");
    await openChat(page);
    await ask(page, "How much is this?");
    await expect(page.getByRole("dialog").getByText("ok")).toBeVisible();
    expect(bodies[0].page).toMatchObject({ path: "/demo/products/black-pepper" });
    expect(bodies[0].page?.title).toContain("Tellicherry Black Pepper");
    expect(bodies[0].page?.content).toContain("₹240");

    await page.getByRole("link", { name: "Shipping & returns" }).first().click();
    await expect(page).toHaveURL(/shipping-returns/);
    if (!(await page.getByRole("dialog").isVisible())) await openChat(page);
    await ask(page, "And delivery?");
    await expect.poll(() => bodies.length).toBe(2);
    expect(bodies[1].page).toMatchObject({ path: "/demo/shipping-returns" });
    expect(bodies[1].page?.content).toContain("Free shipping on orders of ₹799");
    // Conversation continuity across navigation: first turn sent as history.
    expect(bodies[1].history).toEqual([
      { role: "user", content: "How much is this?" },
      { role: "assistant", content: "ok" },
    ]);
  });

  test("Malayalam input and output render correctly", async ({ page }) => {
    await mockChat(page, () => "കുരുമുളകിന് ₹240 (200 ഗ്രാം) ആണ്.");
    await page.goto("/demo");
    await openChat(page);
    await ask(page, "കുരുമുളകിന്റെ വില എത്രയാണ്?");
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("കുരുമുളകിന്റെ വില എത്രയാണ്?")).toBeVisible();
    await expect(dialog.getByText("കുരുമുളകിന് ₹240 (200 ഗ്രാം) ആണ്.")).toBeVisible();
  });

  test("New chat resets the conversation", async ({ page }) => {
    await mockChat(page, () => "First answer");
    await page.goto("/demo");
    await openChat(page);
    await ask(page, "First question");
    await expect(page.getByText("First answer")).toBeVisible();
    await page.getByRole("button", { name: "New chat" }).click();
    await expect(page.getByText("First question")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "What is your return policy?" })).toBeVisible();
  });

  test("mobile: panel fits the screen, no horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await mockChat(page, () => "ok");
    await page.goto("/demo");
    await openChat(page);
    const box = await page.getByRole("dialog").boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(360);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });

  test("keyboard: launcher focusable, Escape closes and returns focus", async ({ page }) => {
    await page.goto("/demo");
    const launcher = page.getByRole("button", { name: "Chat with Mira" });
    await launcher.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByLabel("Message Mira")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(launcher).toBeFocused();
  });
});

test.describe("assistant backend (real server, no provider configured)", () => {
  test("status reports not configured; chat shows a friendly error with retry", async ({
    page,
    request,
  }) => {
    const status = await request.get("/api/assistant/status?siteId=malabar-spice");
    expect(status.status()).toBe(200);
    expect((await status.json()).data).toMatchObject({ ready: false, configured: false });

    await page.goto("/demo");
    await openChat(page);
    await ask(page, "Hello");
    const alert = page.getByRole("dialog").getByRole("alert");
    await expect(alert).toContainText("not set up yet");
    await expect(alert.getByRole("button", { name: "Try again" })).toBeVisible();
  });

  test("rejects foreign origins and invalid input", async ({ request }) => {
    const foreign = await request.post("/api/assistant/chat", {
      headers: { Origin: "https://evil.example" },
      data: { siteId: "malabar-spice", message: "hi" },
    });
    expect(foreign.status()).toBe(403);
    const invalid = await request.post("/api/assistant/chat", {
      data: { siteId: "malabar-spice", message: "" },
    });
    expect(invalid.status()).toBe(422);
  });

  test("demo pages render the knowledge Markdown with anchors used by sources", async ({
    page,
  }) => {
    await page.goto("/demo/shipping-returns#damaged-or-wrong-items");
    await expect(page.locator("#damaged-or-wrong-items")).toHaveText("Damaged or wrong items");
    await expect(page.getByText("within 48 hours of delivery")).toBeVisible();
  });
});
