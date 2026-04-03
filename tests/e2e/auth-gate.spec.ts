import { expect, test } from "@playwright/test";

test.describe("Auth-protected routes", () => {
  test("redirects unauthenticated users from /feed to /login", async ({ page }) => {
    await page.goto("/feed");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Log In" })).toBeVisible();
  });

  test("opens signup mode when query mode=signup", async ({ page }) => {
    await page.goto("/login?mode=signup");
    await expect(page.getByRole("heading", { name: "Create Account" })).toBeVisible();
  });
});
