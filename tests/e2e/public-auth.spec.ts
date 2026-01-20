import { test, expect } from "@playwright/test";

test.describe("Public auth routes", () => {
  test("unauthenticated can access /login", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/login/);

    await expect(page.getByTestId("public-shell-title")).toHaveText("Entrar");
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  });

  test("unauthenticated can access /signup", async ({ page }) => {
    await page.goto("/signup");
    await expect(page).toHaveURL(/\/signup/);

    await expect(page.getByTestId("public-shell-title")).toHaveText("Criar conta");

    // IDs determinísticos
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator("#passwordConfirm")).toBeVisible();

    await expect(page.getByRole("button", { name: "Criar conta" })).toBeVisible();
  });

  test("unauthenticated can access /recuperar-senha", async ({ page }) => {
    await page.goto("/recuperar-senha");
    await expect(page).toHaveURL(/\/recuperar-senha/);

    await expect(page.getByTestId("public-shell-title")).toHaveText("Recuperar senha");
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.getByRole("button", { name: "Enviar link" })).toBeVisible();
  });
});
