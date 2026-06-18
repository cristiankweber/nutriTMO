import { expect, test } from "@playwright/test";
import { collectConsoleProblems, expectNoConsoleProblems, expectNoFrameworkOverlay, formWithButton, loginAsAdmin } from "./helpers";

test("operacao de leitos permite transferencia alta e readmissao de paciente inativo", async ({ page }) => {
  const consoleProblems = collectConsoleProblems(page);

  await loginAsAdmin(page);
  await page.goto("/patients");
  await expect(page.getByRole("heading", { name: "Pacientes e admissoes" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Leitos livres/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Inativos/ })).toBeVisible();
  await expectNoFrameworkOverlay(page);

  const transferForm = formWithButton(page, "Trocar leito");
  await transferForm.getByRole("button", { name: "Trocar leito" }).click();
  await expect(page).toHaveURL(/\/patients\?secao=transferencia&status=ativas$/);
  await expect(page.getByText("Troca de leito registrada")).toBeVisible();
  await expectNoFrameworkOverlay(page);

  const dischargeForm = formWithButton(page, "Dar alta");
  await dischargeForm.getByRole("button", { name: "Dar alta" }).click();
  await expect(page).toHaveURL(/\/patients\?secao=alta&status=ativas$/);
  await expect(page.getByText("Alta registrada")).toBeVisible();
  await expectNoFrameworkOverlay(page);

  await page.goto("/patients?status=inativos");
  await expect(page.getByRole("heading", { name: /Pacientes inativos/ })).toBeVisible();
  const inactiveOptions = await page.locator("select[name='patientId'] option").count();
  expect(inactiveOptions).toBeGreaterThanOrEqual(2);

  const admissionForm = formWithButton(page, "Admitir paciente");
  await admissionForm.locator('select[name="patientId"]').selectOption({ index: 1 });
  await admissionForm.getByRole("button", { name: "Admitir paciente" }).click();
  await expect(page).toHaveURL(/\/patients\/.+\?admissao=salva$/);
  await expect(page.getByText("Admissao criada")).toBeVisible();
  await expectNoFrameworkOverlay(page);

  await page.goto("/patients?status=ativas");
  await expect(page.getByRole("heading", { name: "Admissoes ativas (5)" })).toBeVisible();
  await expectNoFrameworkOverlay(page);
  await expectNoConsoleProblems(consoleProblems);
});
