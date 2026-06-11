import type { Prisma } from "../../generated/prisma/client";

export type MealStatusValue = "PLANEJADA" | "SERVIDA" | "PARCIALMENTE_REGISTRADA" | "FINALIZADA" | "REVISADA" | "CANCELADA";
export type ImageQualityValue = "ADEQUADA" | "INADEQUADA" | "NAO_AVALIADA";
export type ConfidenceValue = "ALTA" | "MEDIA" | "BAIXA" | "NAO_APLICAVEL";
export type ConsumedPercentValue = "ZERO" | "TWENTY_FIVE" | "FIFTY" | "SEVENTY_FIVE" | "ONE_HUNDRED";
export type AlertLevelValue = "VERDE" | "AMARELO" | "LARANJA" | "VERMELHO" | "CINZA";

export type ReviewReason = "foto_inadequada" | "confianca_baixa" | "refeicao_incompleta" | "correcao_manual" | "outro";

export type ReviewableMeal = {
  status: MealStatusValue;
  imageQuality: ImageQualityValue;
  confidence: ConfidenceValue;
  notes?: string | null;
};

export type ReviewableMealItem = {
  id: string;
  foodItemId?: string | null;
  consumedPercent: ConsumedPercentValue;
  consumedKcal?: number | null;
  consumedProtein?: number | null;
};

export type ReviewAuditMeal = ReviewableMeal & {
  items?: ReviewableMealItem[];
};

export type ReviewPercentDiff = {
  itemId: string;
  foodItemId?: string | null;
  beforePercent: ConsumedPercentValue;
  afterPercent: ConsumedPercentValue;
  beforeKcal?: number | null;
  afterKcal?: number | null;
  beforeProtein?: number | null;
  afterProtein?: number | null;
  changed: boolean;
};

export type ReviewMetadata = {
  reasons: ReviewReason[];
  observation: string | null;
  percentDiffs: ReviewPercentDiff[];
};

export const reviewReasonLabels: Record<ReviewReason, string> = {
  foto_inadequada: "Foto inadequada",
  confianca_baixa: "Baixa confianca",
  refeicao_incompleta: "Refeicao incompleta",
  correcao_manual: "Correcao manual",
  outro: "Outro",
};

export const getReviewQueueWhereClause = (): Prisma.MealWhereInput => ({
  status: { notIn: ["REVISADA", "CANCELADA"] },
  OR: [{ status: "PARCIALMENTE_REGISTRADA" }, { imageQuality: "INADEQUADA" }, { confidence: "BAIXA" }],
});

export const isMealPendingReview = (meal: ReviewableMeal) => {
  if (meal.status === "REVISADA" || meal.status === "CANCELADA") return false;
  return meal.status === "PARCIALMENTE_REGISTRADA" || meal.imageQuality === "INADEQUADA" || meal.confidence === "BAIXA";
};

export const isMealOperationallyIncomplete = (meal: ReviewableMeal) =>
  meal.status !== "CANCELADA" && (meal.status === "PLANEJADA" || meal.status === "SERVIDA" || meal.status === "PARCIALMENTE_REGISTRADA");

export const isMealReviewed = (meal: ReviewableMeal) => meal.status === "REVISADA";

export const isNutritionAlertLevel = (alertLevel: AlertLevelValue) =>
  alertLevel === "AMARELO" || alertLevel === "LARANJA" || alertLevel === "VERMELHO";

export const getReviewReasons = (before?: ReviewAuditMeal | null, after?: ReviewAuditMeal | null): ReviewReason[] => {
  const source = before ?? after;
  const reasons = new Set<ReviewReason>();

  if (source?.imageQuality === "INADEQUADA") reasons.add("foto_inadequada");
  if (source?.confidence === "BAIXA") reasons.add("confianca_baixa");
  if (source?.status === "PARCIALMENTE_REGISTRADA" || source?.status === "PLANEJADA" || source?.status === "SERVIDA") {
    reasons.add("refeicao_incompleta");
  }

  const diffs = getReviewPercentDiffs(before, after);
  if (diffs.some((diff) => diff.changed)) reasons.add("correcao_manual");

  if (reasons.size === 0) reasons.add("outro");
  return [...reasons];
};

export const getReviewPercentDiffs = (before?: ReviewAuditMeal | null, after?: ReviewAuditMeal | null): ReviewPercentDiff[] => {
  const beforeItems = new Map((before?.items ?? []).map((item) => [item.id, item]));

  return (after?.items ?? []).map((afterItem) => {
    const beforeItem = beforeItems.get(afterItem.id);
    const beforePercent = beforeItem?.consumedPercent ?? afterItem.consumedPercent;

    return {
      itemId: afterItem.id,
      foodItemId: afterItem.foodItemId ?? beforeItem?.foodItemId ?? null,
      beforePercent,
      afterPercent: afterItem.consumedPercent,
      beforeKcal: beforeItem?.consumedKcal ?? null,
      afterKcal: afterItem.consumedKcal ?? null,
      beforeProtein: beforeItem?.consumedProtein ?? null,
      afterProtein: afterItem.consumedProtein ?? null,
      changed: beforePercent !== afterItem.consumedPercent,
    };
  });
};

export const buildReviewMetadata = (before: ReviewAuditMeal, after: ReviewAuditMeal, observation: string | null): ReviewMetadata => {
  const percentDiffs = getReviewPercentDiffs(before, after);
  const reasons = getReviewReasons(before, after);

  return {
    reasons,
    observation,
    percentDiffs,
  };
};

export const getReviewMetadataFromLog = (beforeJson: unknown, afterJson: unknown): ReviewMetadata => {
  const afterRecord = asRecord(afterJson);
  const metadata = asRecord(afterRecord?.reviewMetadata);

  if (metadata) {
    return {
      reasons: parseReasons(metadata.reasons),
      observation: typeof metadata.observation === "string" ? metadata.observation : null,
      percentDiffs: Array.isArray(metadata.percentDiffs) ? (metadata.percentDiffs as ReviewPercentDiff[]) : [],
    };
  }

  const before = beforeJson as ReviewAuditMeal | null;
  const after = afterJson as ReviewAuditMeal | null;
  return {
    reasons: getReviewReasons(before, after),
    observation: typeof after?.notes === "string" ? after.notes : null,
    percentDiffs: getReviewPercentDiffs(before, after),
  };
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const parseReasons = (value: unknown): ReviewReason[] => {
  if (!Array.isArray(value)) return ["outro"];
  const reasons = value.filter((reason): reason is ReviewReason => reason in reviewReasonLabels);
  return reasons.length > 0 ? reasons : ["outro"];
};
