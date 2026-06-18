import { describe, expect, it } from "vitest";
import { buildMealReportText, buildDailyReportText } from "../src/lib/reporting/nutritionReport";
import { buildMealNutrientReport } from "../src/lib/clinical/calculations";

describe("texto copiavel de relatorios", () => {
  it("inclui sodio no resumo por refeicao", () => {
    const report = buildMealNutrientReport([
      {
        mealType: "ALMOCO",
        status: "FINALIZADA",
        items: [{ consumedKcal: 300, consumedCarbs: 40, consumedProtein: 18, consumedFat: 8, consumedSodium: 520 }],
      },
    ]);

    const text = buildMealReportText({ date: new Date(2026, 5, 17), report });
    expect(text).toContain("520 mg de sodio");
  });

  it("monta resumo diario com alerta e contagem de refeicoes", () => {
    const text = buildDailyReportText({
      kcal: 900,
      protein: 42,
      kcalPercent: 50,
      proteinPercent: 52,
      completeMeals: 2,
      reviewedMeals: 1,
      totalMeals: 3,
      alertLevel: "LARANJA",
    });

    expect(text).toContain("900 kcal");
    expect(text).toContain("Alerta laranja");
    expect(text).toContain("2/3 refeicao(oes) completas");
  });
});
