import { expect, test } from "@playwright/test";
import {
  collectConsoleProblems,
  expectNoConsoleProblems,
  expectNoFrameworkOverlay,
  loginAs,
  nutritionEmail,
} from "./helpers";

test("nutricao acessa relatorios e fica bloqueada em auditoria", async ({ page }) => {
  const consoleProblems = collectConsoleProblems(page);

  await loginAs(page, nutritionEmail);
  await page.goto("/reports");
  await expect(page.getByRole("heading", { name: "Relatorio nutricional" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copiar" }).first()).toBeVisible();
  await expectNoFrameworkOverlay(page);

  await page.goto("/audit");
  await expect(page.getByRole("heading", { name: "Acesso restrito" })).toBeVisible();
  await expectNoFrameworkOverlay(page);
  await expectNoConsoleProblems(consoleProblems);
});
