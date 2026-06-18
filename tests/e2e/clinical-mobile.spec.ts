import { expect, test } from "@playwright/test";
import { collectConsoleProblems, expectNoConsoleProblems, expectNoFrameworkOverlay, loginAsAdmin } from "./helpers";

test("mobile preserva filtros, resumo fixo de refeicao e auditoria em cards", async ({ page }) => {
  const consoleProblems = collectConsoleProblems(page);

  await loginAsAdmin(page);
  await page.getByRole("button", { name: /Alertas/ }).click();
  await expect(page.getByRole("button", { name: /Alertas/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("body")).toContainText(/TMO-|Leito livre/);
  await expectNoFrameworkOverlay(page);

  await page.goto("/meals/new");
  await expect(page.getByRole("heading", { name: "Registro de ingesta" })).toBeVisible();
  await page.getByRole("button", { name: "Suplemento" }).click();
  await page.getByRole("button", { name: "100%" }).click();
  const stickySummary = page.locator('[aria-live="polite"]').filter({ hasText: "Resumo da ingesta" });
  await expect(stickySummary).toBeVisible();
  await expect(stickySummary).toContainText("Kcal");
  await expect(stickySummary).toContainText("PTN");
  await expect(stickySummary.getByRole("button", { name: "Finalizar" })).toBeVisible();
  await expectNoFrameworkOverlay(page);

  await page.goto("/audit");
  await expect(page.getByRole("heading", { name: "Auditoria" })).toBeVisible();
  await expect(page.locator("article").first()).toBeVisible();
  await expect(page.locator("table").first()).toBeHidden();
  await page.getByText("Depois JSON").first().click();
  await expect(page.locator("pre").first()).toBeVisible();
  await expectNoFrameworkOverlay(page);

  await expectNoConsoleProblems(consoleProblems);
});
