import { expect, test, type Page } from "@playwright/test";

const password = "correct-horse-battery";
const email = (who: string) =>
  `${who}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;

async function fillSignUp(page: Page, name: string) {
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email(name.toLowerCase().replace(/\s+/g, "-")));
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign up" }).click();
}

/** datetime-local value for "N hours ago" in the browser's local time. */
function localTimeHoursAgo(hours: number) {
  const d = new Date(Date.now() - hours * 3600_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function describeAndLaunch(
  page: Page,
  text: string,
  expectedSituation: string,
  startsLocal?: string,
) {
  await page.goto("/app");
  await page.getByRole("link", { name: "Start a new operation" }).first().click();
  await page.getByLabel("Describe the situation").fill(text);
  if (startsLocal) await page.getByLabel(/When does it start/).fill(startsLocal);
  await page.getByRole("button", { name: "Suggest a setup" }).click();
  await expect(page.getByText(expectedSituation, { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Launch operation" }).click();
  await expect(page.getByText("Your operation is live")).toBeVisible();
  return (await page.getByTestId("join-url").textContent())!.trim();
}

test.describe("one platform, every situation", () => {
  for (const [text, situation, memberLabel] of [
    [
      "College festival tomorrow, 40 volunteers and 3 event locations.",
      "Festival or event",
      "Volunteer",
    ],
    ["University exam at 10 am, 6 halls and 30 invigilators.", "Exam day", "Invigilator"],
    [
      "Flood in 3 wards, 25 responders, relief camp at the school.",
      "Flood or emergency response",
      "Responder",
    ],
  ]) {
    test(`describe → launch: ${situation}`, async ({ page }) => {
      await page.goto("/sign-up");
      await fillSignUp(page, "Organizer");
      await expect(page).toHaveURL(/\/app$/);
      await describeAndLaunch(page, text, situation);
      await expect(page.getByText(`Anyone who joins starts as ${memberLabel}`)).toBeVisible();
    });
  }
});

test("full journey: launch, join by link, do a task, report and resolve a problem", async ({
  browser,
}) => {
  const orgContext = await browser.newContext();
  const org = await orgContext.newPage();
  await org.goto("/sign-up");
  await fillSignUp(org, "Priya Controller");
  await expect(org).toHaveURL(/\/app$/);
  const joinUrl = await describeAndLaunch(
    org,
    "University exam today, 2 halls and 10 invigilators.",
    "Exam day",
    localTimeHoursAgo(2),
  );
  await expect(org.getByRole("img", { name: /QR code/ })).toBeVisible();

  // A first-time participant opens the link, signs up on the same page and joins.
  const volContext = await browser.newContext();
  const vol = await volContext.newPage();
  await vol.goto(joinUrl);
  await expect(vol.getByText("Create your account to join")).toBeVisible();
  await fillSignUp(vol, "Ravi Kumar");
  await vol.getByLabel("Your hall team").selectOption({ label: "Hall 1" });
  await vol.getByRole("button", { name: "Join" }).click();

  await expect(vol.getByText("Invigilator", { exact: true })).toBeVisible();
  await expect(vol.getByText("Right now")).toBeVisible();
  await vol.getByRole("button", { name: "Start Duty" }).first().click();
  await vol.getByRole("button", { name: "Mark as Completed" }).click();
  await vol.getByRole("button", { name: "Confirm completed" }).click();
  await expect(vol.getByText("You have completed 1")).toBeVisible();

  await vol.getByRole("button", { name: "Report an incident" }).click();
  await vol.getByLabel("What's wrong?").fill("Two candidates without hall tickets");
  await vol.getByLabel(/This is urgent/).check();
  await vol.getByRole("button", { name: "Send" }).click();
  await expect(vol.getByText("Sent", { exact: true })).toBeVisible();

  // The coordinator sees it first, with late duties counted.
  await org.getByRole("link", { name: "Go to the command centre" }).click();
  const problem = org
    .getByRole("listitem")
    .filter({ hasText: "Two candidates without hall tickets" })
    .filter({
      has: org.getByRole("button", { name: "Mark resolved" }),
    });
  await expect(problem).toBeVisible();
  await expect(problem.getByText("Urgent")).toBeVisible();
  await expect(org.getByText(/urgent incidents/)).toBeVisible();
  await expect(org.getByText(/Ravi Kumar completed/)).toBeVisible();
  await problem.getByRole("button", { name: "Mark resolved" }).click();
  await expect(org.getByRole("button", { name: "Mark resolved" })).toHaveCount(0);
  await expect(org.getByText(/resolved "Two candidates/)).toBeVisible();

  // The participant never sees the command centre.
  const opUrl = vol.url();
  await vol.goto(`${opUrl.split("?")[0]}/share`);
  await expect(vol.getByRole("heading", { level: 1, name: "Page not found" })).toBeVisible();

  await orgContext.close();
  await volContext.close();
});
