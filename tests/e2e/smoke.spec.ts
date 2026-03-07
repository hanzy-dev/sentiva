import { expect, test } from "@playwright/test";

test("home loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
});

test("login page loads", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveURL(/\/login/);
});

test("vault redirects to login when unauthenticated", async ({ page }) => {
  await page.goto("/vault");
  await expect(page).toHaveURL(/\/login/);
});

test("health is OK", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBeTruthy();
});