import { expect, test } from "@playwright/test";
import {
  collectConsoleProblems,
  expectNoConsoleProblems,
  expectNoFrameworkOverlay,
  loginAs,
  nursingEmail,
} from "./helpers";

test("enfermagem registra ingesta sem acesso a relatorios", async ({ page }) => {
  const consoleProblems = collectConsoleProblems(page);

  await loginAs(page, nursingEmail);
  await page.goto("/meals/new");
  await expect(page.getByRole("heading", { name: "Registro de ingesta" })).toBeVisible();
  await expectNoFrameworkOverlay(page);

  await page.goto("/reports");
  await expect(page.getByRole("heading", { name: "Acesso restrito" })).toBeVisible();
  await expectNoFrameworkOverlay(page);
  await expectNoConsoleProblems(consoleProblems);
});
