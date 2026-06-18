import { expect, type Locator, type Page } from "@playwright/test";

export const demoPassword = "nutritmo123";
export const adminEmail = "admin@nutritmo.local";
export const auditorEmail = "auditor@nutritmo.local";
export const nutritionEmail = "nutricao@nutritmo.local";
export const nursingEmail = "enfermagem@nutritmo.local";

export function collectConsoleProblems(page: Page) {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(message.text());
  });
  page.on("pageerror", (error) => problems.push(error.message));
  return problems;
}

export async function expectNoConsoleProblems(problems: string[]) {
  expect(problems.join("\n")).toBe("");
}

export async function expectNoFrameworkOverlay(page: Page) {
  await expect(page.locator("nextjs-portal")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(/Application error|Unhandled Runtime Error|NEXT_REDIRECT/i);
}

export async function loginAs(
  page: Page,
  email: string,
  expected: { url: RegExp; heading: string | RegExp } = {
    url: /\/dashboard$/,
    heading: "Dashboard da unidade",
  },
) {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "NutriTMO" })).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Senha").fill(demoPassword);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(expected.url);
  await expect(page.getByRole("heading", { name: expected.heading })).toBeVisible();
  await expectNoFrameworkOverlay(page);
}

export async function loginAsAdmin(page: Page) {
  await loginAs(page, adminEmail);
}

export function formWithButton(page: Page, buttonName: string | RegExp) {
  return page.locator("form").filter({ has: page.getByRole("button", { name: buttonName }) }).first();
}

export async function fillByName(form: Locator, fieldName: string, value: string) {
  await form.locator(`[name="${fieldName}"]`).fill(value);
}

export async function selectByName(form: Locator, fieldName: string, value: string) {
  await form.locator(`select[name="${fieldName}"]`).selectOption(value);
}
