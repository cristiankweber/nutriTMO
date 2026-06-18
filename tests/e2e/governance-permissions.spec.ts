import { expect, test } from "@playwright/test";
import {
  auditorEmail,
  collectConsoleProblems,
  expectNoConsoleProblems,
  expectNoFrameworkOverlay,
  loginAs,
  nutritionEmail,
} from "./helpers";

test("nutricao fica bloqueada em auditoria com estado controlado", async ({ page }) => {
  const consoleProblems = collectConsoleProblems(page);

  await loginAs(page, nutritionEmail);
  await page.goto("/audit");
  await expect(page.getByRole("heading", { name: "Acesso restrito" })).toBeVisible();
  await expect(page.locator("body")).toContainText("auditoria fica na area de Governanca");
  await expect(page.getByRole("link", { name: "Voltar para Atendimento" })).toBeVisible();
  await expectNoFrameworkOverlay(page);
  await expectNoConsoleProblems(consoleProblems);
});

test("auditor fica restrito a auditoria e governanca", async ({ page }) => {
  const consoleProblems = collectConsoleProblems(page);

  await loginAs(page, auditorEmail, { url: /\/audit$/, heading: "Auditoria" });
  await expect(page.getByRole("link", { name: /Unidade/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Relatorios/ })).toHaveCount(0);

  await page.goto("/governance");
  await expect(page.getByRole("heading", { name: "Governanca e seguranca" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Executar limpeza vencida" })).toHaveCount(0);
  await expect(page.locator("body")).toContainText("Auditor visualiza a politica");
  await expectNoFrameworkOverlay(page);

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Acesso restrito" })).toBeVisible();
  await expectNoFrameworkOverlay(page);

  await page.goto("/reports");
  await expect(page.getByRole("heading", { name: "Acesso restrito" })).toBeVisible();
  await expectNoFrameworkOverlay(page);
  await expectNoConsoleProblems(consoleProblems);

  const exportResponse = await page.goto("/api/exports/patient-report?admissionId=demo&format=xlsx");
  expect(exportResponse?.status()).toBe(403);

  const imageResponse = await page.goto("/api/images/demo");
  expect(imageResponse?.status()).toBe(403);
});
