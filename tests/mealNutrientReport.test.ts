import { describe, expect, it } from "vitest";
import { buildMealNutrientReport, type MealNutrientReportMealInput } from "../src/lib/clinical/calculations";

const finalizedMeal = (
  mealType: MealNutrientReportMealInput["mealType"],
  consumedKcal: number,
  consumedCarbs: number,
  consumedProtein: number,
  consumedFat: number,
  consumedSodium = 0,
): MealNutrientReportMealInput => ({
  mealType,
  status: "FINALIZADA",
  items: [{ consumedKcal, consumedCarbs, consumedProtein, consumedFat, consumedSodium }],
});

describe("relatorio nutricional por refeicao", () => {
  it("soma nutrientes por refeicao e total diario", () => {
    const report = buildMealNutrientReport([
      finalizedMeal("CAFE_MANHA", 257, 31, 7, 11),
      finalizedMeal("ALMOCO", 340, 44, 19, 6),
      finalizedMeal("LANCHE_TARDE", 700, 98, 10, 30),
      finalizedMeal("JANTAR", 210, 46, 4, 2),
    ]);

    const lunch = report.rows.find((row) => row.mealType === "ALMOCO");
    expect(lunch).toMatchObject({
      totalConsumedKcal: 340,
      totalConsumedCarbs: 44,
      totalConsumedProtein: 19,
      totalConsumedFat: 6,
    });
    expect(report.total).toMatchObject({
      totalConsumedKcal: 1507,
      totalConsumedCarbs: 219,
      totalConsumedProtein: 40,
      totalConsumedFat: 49,
      totalConsumedSodium: 0,
    });
  });

  it("soma sodio por refeicao e total diario", () => {
    const report = buildMealNutrientReport([
      finalizedMeal("CAFE_MANHA", 257, 31, 7, 11, 320),
      finalizedMeal("ALMOCO", 340, 44, 19, 6, 540),
    ]);

    expect(report.rows.find((row) => row.mealType === "ALMOCO")).toMatchObject({ totalConsumedSodium: 540 });
    expect(report.total.totalConsumedSodium).toBe(860);
  });

  it("identifica menor kcal, menor proteina, maior kcal e maior proteina", () => {
    const report = buildMealNutrientReport([
      finalizedMeal("CAFE_MANHA", 257, 31, 7, 11),
      finalizedMeal("ALMOCO", 340, 44, 19, 6),
      finalizedMeal("LANCHE_TARDE", 700, 98, 10, 30),
      finalizedMeal("JANTAR", 210, 46, 4, 2),
    ]);

    expect(report.lowestKcalMeal?.mealType).toBe("JANTAR");
    expect(report.lowestProteinMeal?.mealType).toBe("JANTAR");
    expect(report.highestKcalMeal?.mealType).toBe("LANCHE_TARDE");
    expect(report.highestProteinMeal?.mealType).toBe("ALMOCO");
    expect(report.rows.find((row) => row.mealType === "JANTAR")).toMatchObject({ isLowestKcal: true, isLowestProtein: true });
  });

  it("exclui refeicoes canceladas do calculo", () => {
    const report = buildMealNutrientReport([
      finalizedMeal("CAFE_MANHA", 257, 31, 7, 11),
      {
        mealType: "ALMOCO",
        status: "CANCELADA",
        items: [{ consumedKcal: 999, consumedCarbs: 999, consumedProtein: 999, consumedFat: 999 }],
      },
    ]);

    expect(report.total.totalConsumedKcal).toBe(257);
    expect(report.rows.find((row) => row.mealType === "ALMOCO")).toMatchObject({ hasRecord: false, totalConsumedKcal: 0 });
  });

  it("usa valores revisados persistidos e marca refeicao revisada", () => {
    const report = buildMealNutrientReport([
      finalizedMeal("CAFE_MANHA", 257, 31, 7, 11),
      {
        mealType: "JANTAR",
        status: "REVISADA",
        items: [{ consumedKcal: 210, consumedCarbs: 46, consumedProtein: 4, consumedFat: 2, manuallyReviewed: true }],
      },
    ]);

    const dinner = report.rows.find((row) => row.mealType === "JANTAR");
    expect(dinner).toMatchObject({
      totalConsumedKcal: 210,
      totalConsumedProtein: 4,
      isReviewed: true,
    });
  });

  it("marca refeicao pendente ou incompleta", () => {
    const report = buildMealNutrientReport([
      finalizedMeal("CAFE_MANHA", 257, 31, 7, 11),
      {
        mealType: "ALMOCO",
        status: "PARCIALMENTE_REGISTRADA",
        items: [{ consumedKcal: 120, consumedCarbs: 20, consumedProtein: 5, consumedFat: 3 }],
      },
    ]);

    expect(report.rows.find((row) => row.mealType === "ALMOCO")).toMatchObject({ hasRecord: true, isPending: true });
    expect(report.rows.find((row) => row.mealType === "JANTAR")).toMatchObject({ hasRecord: false });
  });
});
