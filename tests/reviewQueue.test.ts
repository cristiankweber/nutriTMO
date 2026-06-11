import { describe, expect, it } from "vitest";
import { buildDailySummary } from "../src/lib/clinical/calculations";
import {
  getReviewMetadataFromLog,
  getReviewQueueWhereClause,
  isMealPendingReview,
} from "../src/lib/review/rules";

const baseMeal = {
  status: "FINALIZADA" as const,
  imageQuality: "ADEQUADA" as const,
  confidence: "ALTA" as const,
};

describe("fila de revisao humana", () => {
  it("inclui refeicao finalizada com foto inadequada", () => {
    expect(isMealPendingReview({ ...baseMeal, imageQuality: "INADEQUADA" })).toBe(true);
  });

  it("inclui refeicao finalizada com baixa confianca", () => {
    expect(isMealPendingReview({ ...baseMeal, confidence: "BAIXA" })).toBe(true);
  });

  it("exclui refeicao revisada mesmo com foto inadequada", () => {
    expect(isMealPendingReview({ ...baseMeal, status: "REVISADA", imageQuality: "INADEQUADA" })).toBe(false);
  });

  it("exclui refeicao revisada mesmo com baixa confianca", () => {
    expect(isMealPendingReview({ ...baseMeal, status: "REVISADA", confidence: "BAIXA" })).toBe(false);
  });

  it("exclui refeicao cancelada", () => {
    expect(isMealPendingReview({ ...baseMeal, status: "CANCELADA", imageQuality: "INADEQUADA", confidence: "BAIXA" })).toBe(false);
  });

  it("usa REVISADA e CANCELADA como exclusao central da query", () => {
    expect(getReviewQueueWhereClause()).toMatchObject({
      status: { notIn: ["REVISADA", "CANCELADA"] },
      OR: [{ status: "PARCIALMENTE_REGISTRADA" }, { imageQuality: "INADEQUADA" }, { confidence: "BAIXA" }],
    });
  });

  it("mantem refeicao revisada representavel no historico/auditoria", () => {
    const metadata = getReviewMetadataFromLog(
      {
        status: "FINALIZADA",
        imageQuality: "INADEQUADA",
        confidence: "BAIXA",
        items: [{ id: "item-1", foodItemId: "food-1", consumedPercent: "TWENTY_FIVE" }],
      },
      {
        status: "REVISADA",
        imageQuality: "INADEQUADA",
        confidence: "BAIXA",
        reviewMetadata: {
          reasons: ["foto_inadequada", "confianca_baixa", "correcao_manual"],
          observation: "Percentual corrigido apos revisao visual.",
          percentDiffs: [
            {
              itemId: "item-1",
              foodItemId: "food-1",
              beforePercent: "TWENTY_FIVE",
              afterPercent: "FIFTY",
              changed: true,
            },
          ],
        },
        items: [{ id: "item-1", foodItemId: "food-1", consumedPercent: "FIFTY" }],
      },
    );

    expect(metadata.reasons).toEqual(["foto_inadequada", "confianca_baixa", "correcao_manual"]);
    expect(metadata.percentDiffs[0]).toMatchObject({ beforePercent: "TWENTY_FIVE", afterPercent: "FIFTY", changed: true });
  });

  it("remove baixa qualidade revisada da fila, mas preserva alerta nutricional por baixa ingesta", () => {
    expect(isMealPendingReview({ ...baseMeal, status: "REVISADA", imageQuality: "INADEQUADA", confidence: "BAIXA" })).toBe(false);

    const summary = buildDailySummary({
      admissionId: "adm-1",
      date: new Date("2026-06-10T00:00:00.000Z"),
      kcalTarget: 1800,
      proteinTarget: 80,
      missingCriticalMealsCount: 0,
      hasInadequatePhotoWithoutReview: false,
      items: [{ servedKcal: 500, consumedKcal: 300, servedProtein: 20, consumedProtein: 12 }],
    });

    expect(summary.alertLevel).toBe("LARANJA");
  });
});
