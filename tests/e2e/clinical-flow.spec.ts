import { stat } from "node:fs/promises";
import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  collectConsoleProblems,
  expectNoConsoleProblems,
  expectNoFrameworkOverlay,
  fillByName,
  formWithButton,
  loginAsAdmin,
  selectByName,
} from "./helpers";

test("fluxo clinico principal funciona ponta a ponta", async ({ page }) => {
  const consoleProblems = collectConsoleProblems(page);

  const stamp = Date.now();
  const dietName = `Dieta E2E ${stamp}`;
  const foodName = `Preparacao E2E ${stamp}`;
  const mealNote = `E2E refeicao pendente ${stamp}`;
  const reviewNote = `Revisao E2E ${stamp}`;
  const cancelReason = `Cancelamento E2E ${stamp}`;

  await loginAsAdmin(page);

  await page.getByRole("button", { name: /Alertas/ }).click();
  await expect(page.getByRole("button", { name: /Alertas/ })).toHaveAttribute("aria-pressed", "true");

  await page.goto("/governance");
  await expect(page.getByRole("heading", { name: "Governanca e seguranca" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Matriz de permissoes" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Executar limpeza vencida" })).toBeVisible();
  await expectNoFrameworkOverlay(page);

  await page.goto("/prescriptions");
  await expect(page.getByRole("heading", { name: "Prescricao nutricional" })).toBeVisible();
  const prescriptionForm = formWithButton(page, "Criar prescricao");
  await fillByName(prescriptionForm, "dietType", dietName);
  await fillByName(prescriptionForm, "consistency", "Normal E2E");
  await fillByName(prescriptionForm, "kcalTarget", "1820");
  await fillByName(prescriptionForm, "proteinTarget", "82");
  await fillByName(prescriptionForm, "restrictions", "Restricao E2E ficticia");
  await fillByName(prescriptionForm, "supplementsPlan", "Suplemento E2E ficticio");
  await prescriptionForm.getByRole("button", { name: "Criar prescricao" }).click();
  await expect(page).toHaveURL(/\/prescriptions\?salvo=1$/);
  await expect(page.getByText("Prescricao atualizada")).toBeVisible();
  await expect(page.getByText(dietName)).toBeVisible();
  await expectNoFrameworkOverlay(page);

  await page.goto("/menu");
  await expect(page.getByRole("heading", { name: "Base alimentar" })).toBeVisible();
  await page.getByText("Novo item de referencia").click();
  const foodForm = formWithButton(page, "Adicionar a base alimentar");
  await fillByName(foodForm, "name", foodName);
  await selectByName(foodForm, "category", "OUTRO");
  await fillByName(foodForm, "standardPortionGrams", "150");
  await fillByName(foodForm, "kcalPerPortion", "210");
  await fillByName(foodForm, "carbsPerPortion", "30");
  await fillByName(foodForm, "proteinPerPortion", "12");
  await fillByName(foodForm, "fatPerPortion", "4");
  await foodForm.getByRole("button", { name: "Adicionar a base alimentar" }).click();
  await expect(page).toHaveURL(/\/menu\?salvo=1$/);
  await expect(page.getByText("Base alimentar atualizada")).toBeVisible();
  await expect(page.getByText(foodName)).toBeVisible();
  await expectNoFrameworkOverlay(page);

  await page.goto("/meals/new");
  await expect(page.getByRole("heading", { name: "Registro de ingesta" })).toBeVisible();
  await page.getByRole("button", { name: "Suplemento" }).click();
  await page.getByRole("button", { name: "25%" }).click();
  const mealForm = formWithButton(page, "Marcar para revisao da nutricao");
  await selectByName(mealForm, "mealType", "SUPLEMENTO");
  await selectByName(mealForm, "imageQuality", "INADEQUADA");
  await selectByName(mealForm, "confidence", "BAIXA");
  await fillByName(mealForm, "notes", mealNote);
  await page.getByRole("button", { name: "Marcar para revisao da nutricao" }).click();
  await expect(page).toHaveURL(/\/patients\/.+\?refeicao=salva$/);
  await expect(page.getByText("Ingesta registrada, resumo diario recalculado e auditoria atualizada.")).toBeVisible();
  const patientUrl = page.url().split("?")[0];
  await expectNoFrameworkOverlay(page);

  await page.goto("/review");
  await expect(page.getByRole("heading", { name: "Revisao humana" })).toBeVisible();
  const reviewForms = page.locator("form").filter({ has: page.getByRole("button", { name: "Salvar revisao" }) });
  const targetReviewForm = await findReviewFormByMealNote(reviewForms, mealNote);
  await selectByName(targetReviewForm, "imageQuality", "ADEQUADA");
  await selectByName(targetReviewForm, "confidence", "ALTA");
  await targetReviewForm.locator('select[name^="percent-"]').first().selectOption("ONE_HUNDRED");
  await targetReviewForm.locator('input[name^="notes-"]').first().fill("Item revisado no E2E");
  await targetReviewForm.locator('textarea[name="mealNotes"]').fill(reviewNote);
  await targetReviewForm.getByRole("button", { name: "Salvar revisao" }).click();
  await expect(page).toHaveURL(/\/review\?salvo=1$/);
  await expect(page.getByText("Revisao salva")).toBeVisible();
  await expectNoFrameworkOverlay(page);

  await page.goto(patientUrl);
  await expect(page.getByText("Historico auditavel da revisao").first()).toBeVisible();
  await expect(page.getByText(reviewNote)).toBeVisible();
  const cancelForm = formWithButton(page, "Cancelar registro");
  await fillByName(cancelForm, "cancelReason", cancelReason);
  await cancelForm.getByRole("button", { name: "Cancelar registro" }).click();
  await expect(page).toHaveURL(/\/patients\/.+\?cancelada=1$/);
  await expect(page.getByText("Refeicao cancelada")).toBeVisible();
  await expect(page.getByText("Historico auditavel do cancelamento").first()).toBeVisible();
  await expect(page.getByText(cancelReason)).toBeVisible();
  await expectNoFrameworkOverlay(page);

  await page.goto("/reports");
  await expect(page.getByRole("heading", { name: "Relatorio nutricional" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Relatorio por refeicao", exact: true })).toBeVisible();
  await expectDownloadedFile(page, page.getByRole("link", { name: "Exportar XLSX" }), /\.xlsx$/);
  await expectDownloadedFile(page, page.getByRole("link", { name: "Exportar PDF" }), /\.pdf$/);
  await expect(page.getByRole("button", { name: "Copiar" }).first()).toBeVisible();
  await expect(page.locator("textarea").first()).toHaveValue(/Resumo nutricional|Sem resumo nutricional/);
  await expectNoFrameworkOverlay(page);

  await page.goto("/audit");
  await expect(page.getByRole("heading", { name: "Auditoria" })).toBeVisible();
  await expectDownloadedFile(page, page.getByRole("link", { name: "Exportar auditoria XLSX" }), /\.xlsx$/);
  await expectDownloadedFile(page, page.getByRole("link", { name: "Exportar auditoria PDF" }), /\.pdf$/);
  await expect(page.locator("body")).toContainText(/CREATE|UPDATE|REVIEW|EXPORT|LOGIN/);
  const afterJsonDetails = page.locator("table details", { hasText: "Depois JSON" }).first();
  await afterJsonDetails.locator("summary").click();
  await expect(afterJsonDetails.locator("pre")).toBeVisible();
  await expectNoFrameworkOverlay(page);
  await expectNoConsoleProblems(consoleProblems);
});

async function findReviewFormByMealNote(reviewForms: Locator, note: string) {
  const count = await reviewForms.count();
  for (let index = 0; index < count; index += 1) {
    const form = reviewForms.nth(index);
    const value = await form.locator('textarea[name="mealNotes"]').inputValue();
    if (value.includes(note)) return form;
  }
  throw new Error(`Nao encontrei o formulario de revisao da refeicao ${note}.`);
}

async function expectDownloadedFile(page: Page, locator: Locator, extension: RegExp) {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    locator.click(),
  ]);
  expect(download.suggestedFilename()).toMatch(extension);
  const path = await download.path();
  expect(path).toBeTruthy();
  const fileStat = await stat(path!);
  expect(fileStat.size).toBeGreaterThan(1000);
  await download.delete();
}
