import { expect, test } from "@playwright/test";

test.describe("Landing (public)", () => {
  test("shows the hero heading", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Irish Students");
  });

  test("exposes primary navigation to communities flow", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: "Explore Communities" })
    ).toBeVisible();
  });
});
