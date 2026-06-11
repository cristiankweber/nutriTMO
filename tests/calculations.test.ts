import { describe, expect, it } from "vitest";
import {
  buildDailySummary,
  calculateConsumedCarbs,
  calculateConsumedFat,
  calculateConsumedKcal,
  calculateConsumedProtein,
  calculateDailyTotals,
  calculateServedCarbs,
  calculateServedFat,
  calculateServedKcal,
  calculateServedProtein,
  calculateTargetPercent,
  generateDailyAlert,
} from "../src/lib/clinical/calculations";

describe("regras nutricionais", () => {
  it("calcula kcal servida por item", () => {
    expect(calculateServedKcal(130, 1.5)).toBe(195);
  });

  it("calcula proteina servida por item", () => {
    expect(calculateServedProtein(31, 0.5)).toBe(15.5);
  });

  it("calcula CHO servido por item", () => {
    expect(calculateServedCarbs(31, 1.5)).toBe(46.5);
  });

  it("calcula LIP servido por item", () => {
    expect(calculateServedFat(11, 0.5)).toBe(5.5);
  });

  it("calcula kcal ingerida por percentual", () => {
    expect(calculateConsumedKcal(220, 25)).toBe(55);
  });

  it("calcula proteina ingerida por percentual", () => {
    expect(calculateConsumedProtein(12, 75)).toBe(9);
  });

  it("calcula CHO ingerido por percentual", () => {
    expect(calculateConsumedCarbs(98, 25)).toBe(24.5);
  });

  it("calcula LIP ingerido por percentual", () => {
    expect(calculateConsumedFat(30, 50)).toBe(15);
  });

  it("soma kcal e proteina diaria", () => {
    expect(
      calculateDailyTotals([
        { servedKcal: 100, consumedKcal: 50, servedProtein: 10, consumedProtein: 5, servedCarbs: 20, consumedCarbs: 10, servedFat: 4, consumedFat: 2 },
        { servedKcal: 200, consumedKcal: 150, servedProtein: 20, consumedProtein: 15, servedCarbs: 30, consumedCarbs: 25, servedFat: 8, consumedFat: 6 },
      ]),
    ).toEqual({
      totalServedKcal: 300,
      totalConsumedKcal: 200,
      totalServedProtein: 30,
      totalConsumedProtein: 20,
      totalServedCarbs: 50,
      totalConsumedCarbs: 35,
      totalServedFat: 12,
      totalConsumedFat: 8,
    });
  });

  it("calcula percentual da meta diaria", () => {
    expect(calculateTargetPercent(780, 1800)).toBe(43.3);
  });

  it("gera alerta verde", () => {
    expect(
      generateDailyAlert({
        kcalTargetPercent: 82,
        proteinTargetPercent: 75,
        missingCriticalMealsCount: 0,
        hasInadequatePhotoWithoutReview: false,
      }),
    ).toBe("VERDE");
  });

  it("gera alerta amarelo", () => {
    expect(
      generateDailyAlert({
        kcalTargetPercent: 74,
        proteinTargetPercent: 90,
        missingCriticalMealsCount: 0,
        hasInadequatePhotoWithoutReview: false,
      }),
    ).toBe("AMARELO");
  });

  it("gera alerta laranja", () => {
    expect(
      generateDailyAlert({
        kcalTargetPercent: 49,
        proteinTargetPercent: 80,
        missingCriticalMealsCount: 0,
        hasInadequatePhotoWithoutReview: false,
      }),
    ).toBe("LARANJA");
  });

  it("gera alerta vermelho por baixa ingesta em 48h", () => {
    expect(
      generateDailyAlert({
        kcalTargetPercent: 49,
        proteinTargetPercent: 80,
        missingCriticalMealsCount: 0,
        hasInadequatePhotoWithoutReview: false,
        previousDayHadLowIntake: true,
      }),
    ).toBe("VERMELHO");
  });

  it("gera alerta cinza quando ha refeicao critica sem registro", () => {
    expect(
      generateDailyAlert({
        kcalTargetPercent: 90,
        proteinTargetPercent: 90,
        missingCriticalMealsCount: 1,
        hasInadequatePhotoWithoutReview: false,
      }),
    ).toBe("CINZA");
  });

  it("gera alerta cinza quando foto inadequada nao foi revisada", () => {
    expect(
      generateDailyAlert({
        kcalTargetPercent: 90,
        proteinTargetPercent: 90,
        missingCriticalMealsCount: 0,
        hasInadequatePhotoWithoutReview: true,
      }),
    ).toBe("CINZA");
  });

  it("nao gera cinza quando foto inadequada ja foi revisada, preservando alerta nutricional", () => {
    expect(
      generateDailyAlert({
        kcalTargetPercent: 42,
        proteinTargetPercent: 80,
        missingCriticalMealsCount: 0,
        hasInadequatePhotoWithoutReview: false,
      }),
    ).toBe("LARANJA");
  });

  it("monta resumo diario com arredondamento e alerta", () => {
    const summary = buildDailySummary({
      admissionId: "adm-demo",
      date: new Date("2026-01-01T00:00:00.000Z"),
      kcalTarget: 1800,
      proteinTarget: 80,
      missingCriticalMealsCount: 0,
      hasInadequatePhotoWithoutReview: false,
      items: [
        { servedKcal: 333.33, consumedKcal: 200.25, servedProtein: 10.25, consumedProtein: 8.75 },
        { servedKcal: 100.12, consumedKcal: 50.12, servedProtein: 5.12, consumedProtein: 2.12 },
      ],
    });

    expect(summary.totalConsumedKcal).toBe(250.4);
    expect(summary.totalConsumedProtein).toBe(10.9);
    expect(summary.kcalTargetPercent).toBe(13.9);
    expect(summary.alertLevel).toBe("LARANJA");
  });
});
