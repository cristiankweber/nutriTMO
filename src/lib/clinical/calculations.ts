export type ConsumedPercentValue = 0 | 25 | 50 | 75 | 100;

export type ConsumedPercentKey =
  | "ZERO"
  | "TWENTY_FIVE"
  | "FIFTY"
  | "SEVENTY_FIVE"
  | "ONE_HUNDRED";

export type AlertLevel = "VERDE" | "AMARELO" | "LARANJA" | "VERMELHO" | "CINZA";

export type NutritionItemInput = {
  kcalPerPortion: number;
  proteinPerPortion: number;
  carbsPerPortion?: number | null;
  fatPerPortion?: number | null;
  servedPortionMultiplier: number;
  consumedPercent: ConsumedPercentValue;
};

export type DailyTotalsInput = {
  servedKcal: number;
  consumedKcal: number;
  servedProtein: number;
  consumedProtein: number;
  servedCarbs?: number;
  consumedCarbs?: number;
  servedFat?: number;
  consumedFat?: number;
};

export type MealReportMealType =
  | "CAFE_MANHA"
  | "LANCHE_MANHA"
  | "ALMOCO"
  | "LANCHE_TARDE"
  | "JANTAR"
  | "CEIA"
  | "SUPLEMENTO"
  | "OUTRO";

export type MealReportStatus =
  | "PLANEJADA"
  | "SERVIDA"
  | "PARCIALMENTE_REGISTRADA"
  | "FINALIZADA"
  | "REVISADA"
  | "CANCELADA";

export type MealNutrientReportItemInput = {
  consumedKcal: number;
  consumedProtein: number;
  consumedCarbs?: number | null;
  consumedFat?: number | null;
  manuallyReviewed?: boolean;
};

export type MealNutrientReportMealInput = {
  mealType: MealReportMealType;
  status: MealReportStatus;
  items: MealNutrientReportItemInput[];
};

export type MealNutrientReportRow = {
  mealType: MealReportMealType | "TOTAL";
  mealCount: number;
  totalConsumedKcal: number;
  totalConsumedCarbs: number;
  totalConsumedProtein: number;
  totalConsumedFat: number;
  kcalPercentOfDay: number;
  hasRecord: boolean;
  isPending: boolean;
  isReviewed: boolean;
  isLowestKcal: boolean;
  isLowestProtein: boolean;
  isHighestKcal: boolean;
  isHighestProtein: boolean;
};

export type MealNutrientReport = {
  rows: MealNutrientReportRow[];
  total: MealNutrientReportRow;
  lowestKcalMeal: MealNutrientReportRow | null;
  lowestProteinMeal: MealNutrientReportRow | null;
  highestKcalMeal: MealNutrientReportRow | null;
  highestProteinMeal: MealNutrientReportRow | null;
};

export type AlertInput = {
  kcalTargetPercent: number;
  proteinTargetPercent: number;
  missingCriticalMealsCount: number;
  hasInadequatePhotoWithoutReview: boolean;
  previousDayHadLowIntake?: boolean;
  hasHighRiskClinicalNote?: boolean;
};

export type DailySummaryInput = {
  admissionId: string;
  date: Date;
  items: DailyTotalsInput[];
  kcalTarget: number;
  proteinTarget: number;
  missingCriticalMealsCount: number;
  hasInadequatePhotoWithoutReview: boolean;
  previousDayHadLowIntake?: boolean;
  hasHighRiskClinicalNote?: boolean;
};

export const consumedPercentToValue: Record<ConsumedPercentKey, ConsumedPercentValue> = {
  ZERO: 0,
  TWENTY_FIVE: 25,
  FIFTY: 50,
  SEVENTY_FIVE: 75,
  ONE_HUNDRED: 100,
};

export const valueToConsumedPercent = (value: number): ConsumedPercentKey => {
  if (value === 25) return "TWENTY_FIVE";
  if (value === 50) return "FIFTY";
  if (value === 75) return "SEVENTY_FIVE";
  if (value === 100) return "ONE_HUNDRED";
  return "ZERO";
};

export const roundNutrition = (value: number) => Math.round((Number.isFinite(value) ? value : 0) * 10) / 10;

export const calculateServedKcal = (kcalPerPortion: number, servedPortionMultiplier: number) =>
  roundNutrition(kcalPerPortion * servedPortionMultiplier);

export const calculateServedProtein = (proteinPerPortion: number, servedPortionMultiplier: number) =>
  roundNutrition(proteinPerPortion * servedPortionMultiplier);

export const calculateServedCarbs = (carbsPerPortion: number | null | undefined, servedPortionMultiplier: number) =>
  roundNutrition((carbsPerPortion ?? 0) * servedPortionMultiplier);

export const calculateServedFat = (fatPerPortion: number | null | undefined, servedPortionMultiplier: number) =>
  roundNutrition((fatPerPortion ?? 0) * servedPortionMultiplier);

export const calculateConsumedKcal = (servedKcal: number, consumedPercent: ConsumedPercentValue) =>
  roundNutrition((servedKcal * consumedPercent) / 100);

export const calculateConsumedProtein = (servedProtein: number, consumedPercent: ConsumedPercentValue) =>
  roundNutrition((servedProtein * consumedPercent) / 100);

export const calculateConsumedCarbs = (servedCarbs: number, consumedPercent: ConsumedPercentValue) =>
  roundNutrition((servedCarbs * consumedPercent) / 100);

export const calculateConsumedFat = (servedFat: number, consumedPercent: ConsumedPercentValue) =>
  roundNutrition((servedFat * consumedPercent) / 100);

export const calculateMealItemNutrition = (input: NutritionItemInput) => {
  const servedKcal = calculateServedKcal(input.kcalPerPortion, input.servedPortionMultiplier);
  const servedProtein = calculateServedProtein(input.proteinPerPortion, input.servedPortionMultiplier);
  const servedCarbs = calculateServedCarbs(input.carbsPerPortion, input.servedPortionMultiplier);
  const servedFat = calculateServedFat(input.fatPerPortion, input.servedPortionMultiplier);

  return {
    servedKcal,
    servedProtein,
    servedCarbs,
    servedFat,
    consumedKcal: calculateConsumedKcal(servedKcal, input.consumedPercent),
    consumedProtein: calculateConsumedProtein(servedProtein, input.consumedPercent),
    consumedCarbs: calculateConsumedCarbs(servedCarbs, input.consumedPercent),
    consumedFat: calculateConsumedFat(servedFat, input.consumedPercent),
  };
};

export const calculateDailyTotals = (items: DailyTotalsInput[]) =>
  items.reduce(
    (totals, item) => ({
      totalServedKcal: roundNutrition(totals.totalServedKcal + item.servedKcal),
      totalConsumedKcal: roundNutrition(totals.totalConsumedKcal + item.consumedKcal),
      totalServedProtein: roundNutrition(totals.totalServedProtein + item.servedProtein),
      totalConsumedProtein: roundNutrition(totals.totalConsumedProtein + item.consumedProtein),
      totalServedCarbs: roundNutrition(totals.totalServedCarbs + (item.servedCarbs ?? 0)),
      totalConsumedCarbs: roundNutrition(totals.totalConsumedCarbs + (item.consumedCarbs ?? 0)),
      totalServedFat: roundNutrition(totals.totalServedFat + (item.servedFat ?? 0)),
      totalConsumedFat: roundNutrition(totals.totalConsumedFat + (item.consumedFat ?? 0)),
    }),
    {
      totalServedKcal: 0,
      totalConsumedKcal: 0,
      totalServedProtein: 0,
      totalConsumedProtein: 0,
      totalServedCarbs: 0,
      totalConsumedCarbs: 0,
      totalServedFat: 0,
      totalConsumedFat: 0,
    },
  );

export const mealReportOrder: MealReportMealType[] = [
  "CAFE_MANHA",
  "LANCHE_MANHA",
  "ALMOCO",
  "LANCHE_TARDE",
  "JANTAR",
  "CEIA",
  "SUPLEMENTO",
  "OUTRO",
];

const requiredMealReportTypes = new Set<MealReportMealType>(["CAFE_MANHA", "ALMOCO", "JANTAR"]);
const optionalMealReportTypes = new Set<MealReportMealType>(["LANCHE_MANHA", "LANCHE_TARDE", "CEIA", "SUPLEMENTO", "OUTRO"]);
const pendingMealStatuses = new Set<MealReportStatus>(["PLANEJADA", "SERVIDA", "PARCIALMENTE_REGISTRADA"]);

const emptyMealReportRow = (mealType: MealReportMealType | "TOTAL"): MealNutrientReportRow => ({
  mealType,
  mealCount: 0,
  totalConsumedKcal: 0,
  totalConsumedCarbs: 0,
  totalConsumedProtein: 0,
  totalConsumedFat: 0,
  kcalPercentOfDay: 0,
  hasRecord: false,
  isPending: false,
  isReviewed: false,
  isLowestKcal: false,
  isLowestProtein: false,
  isHighestKcal: false,
  isHighestProtein: false,
});

const selectExtremeMeal = (
  rows: MealNutrientReportRow[],
  field: "totalConsumedKcal" | "totalConsumedProtein",
  direction: "min" | "max",
) => {
  const candidates = rows.filter((row) => row.hasRecord);
  if (candidates.length === 0) return null;
  return candidates.reduce((selected, row) => {
    if (direction === "min") return row[field] < selected[field] ? row : selected;
    return row[field] > selected[field] ? row : selected;
  }, candidates[0]);
};

export const buildMealNutrientReport = (meals: MealNutrientReportMealInput[]): MealNutrientReport => {
  const activeMeals = meals.filter((meal) => meal.status !== "CANCELADA");
  const mealTypesWithRecords = new Set(activeMeals.map((meal) => meal.mealType));
  const visibleMealTypes = mealReportOrder.filter(
    (mealType) => requiredMealReportTypes.has(mealType) || (optionalMealReportTypes.has(mealType) && mealTypesWithRecords.has(mealType)),
  );
  const rows = visibleMealTypes.map((mealType) => {
    const mealsOfType = activeMeals.filter((meal) => meal.mealType === mealType);
    const row = mealsOfType.reduce((totals, meal) => {
      const itemTotals = meal.items.reduce(
        (itemAcc, item) => ({
          totalConsumedKcal: roundNutrition(itemAcc.totalConsumedKcal + item.consumedKcal),
          totalConsumedCarbs: roundNutrition(itemAcc.totalConsumedCarbs + (item.consumedCarbs ?? 0)),
          totalConsumedProtein: roundNutrition(itemAcc.totalConsumedProtein + item.consumedProtein),
          totalConsumedFat: roundNutrition(itemAcc.totalConsumedFat + (item.consumedFat ?? 0)),
          hasReviewedItem: itemAcc.hasReviewedItem || (item.manuallyReviewed ?? false),
        }),
        {
          totalConsumedKcal: 0,
          totalConsumedCarbs: 0,
          totalConsumedProtein: 0,
          totalConsumedFat: 0,
          hasReviewedItem: false,
        },
      );
      return {
        ...totals,
        mealCount: totals.mealCount + 1,
        totalConsumedKcal: roundNutrition(totals.totalConsumedKcal + itemTotals.totalConsumedKcal),
        totalConsumedCarbs: roundNutrition(totals.totalConsumedCarbs + itemTotals.totalConsumedCarbs),
        totalConsumedProtein: roundNutrition(totals.totalConsumedProtein + itemTotals.totalConsumedProtein),
        totalConsumedFat: roundNutrition(totals.totalConsumedFat + itemTotals.totalConsumedFat),
        hasRecord: true,
        isPending: totals.isPending || pendingMealStatuses.has(meal.status),
        isReviewed: totals.isReviewed || meal.status === "REVISADA" || itemTotals.hasReviewedItem,
      };
    }, emptyMealReportRow(mealType));

    return row;
  });

  const total = rows.reduce(
    (totals, row) => ({
      ...totals,
      mealCount: totals.mealCount + row.mealCount,
      totalConsumedKcal: roundNutrition(totals.totalConsumedKcal + row.totalConsumedKcal),
      totalConsumedCarbs: roundNutrition(totals.totalConsumedCarbs + row.totalConsumedCarbs),
      totalConsumedProtein: roundNutrition(totals.totalConsumedProtein + row.totalConsumedProtein),
      totalConsumedFat: roundNutrition(totals.totalConsumedFat + row.totalConsumedFat),
      hasRecord: totals.hasRecord || row.hasRecord,
      isPending: totals.isPending || row.isPending,
      isReviewed: totals.isReviewed || row.isReviewed,
    }),
    emptyMealReportRow("TOTAL"),
  );

  const rowsWithPercent = rows.map((row) => ({
    ...row,
    kcalPercentOfDay: total.totalConsumedKcal > 0 ? roundNutrition((row.totalConsumedKcal / total.totalConsumedKcal) * 100) : 0,
  }));
  const lowestKcalMeal = selectExtremeMeal(rowsWithPercent, "totalConsumedKcal", "min");
  const lowestProteinMeal = selectExtremeMeal(rowsWithPercent, "totalConsumedProtein", "min");
  const highestKcalMeal = selectExtremeMeal(rowsWithPercent, "totalConsumedKcal", "max");
  const highestProteinMeal = selectExtremeMeal(rowsWithPercent, "totalConsumedProtein", "max");
  const markExtremes = (row: MealNutrientReportRow) => ({
    ...row,
    isLowestKcal: row.hasRecord && row.mealType === lowestKcalMeal?.mealType,
    isLowestProtein: row.hasRecord && row.mealType === lowestProteinMeal?.mealType,
    isHighestKcal: row.hasRecord && row.mealType === highestKcalMeal?.mealType,
    isHighestProtein: row.hasRecord && row.mealType === highestProteinMeal?.mealType,
  });

  return {
    rows: rowsWithPercent.map(markExtremes),
    total: {
      ...total,
      kcalPercentOfDay: total.hasRecord ? 100 : 0,
    },
    lowestKcalMeal,
    lowestProteinMeal,
    highestKcalMeal,
    highestProteinMeal,
  };
};

export const calculateTargetPercent = (consumed: number, target: number) => {
  if (!Number.isFinite(target) || target <= 0) return 0;
  return roundNutrition((consumed / target) * 100);
};

export const isLowIntake = (kcalTargetPercent: number, proteinTargetPercent: number) =>
  kcalTargetPercent < 50 || proteinTargetPercent < 50;

export const generateDailyAlert = (input: AlertInput): AlertLevel => {
  if (input.missingCriticalMealsCount > 0 || input.hasInadequatePhotoWithoutReview) {
    return "CINZA";
  }

  const lowIntake = isLowIntake(input.kcalTargetPercent, input.proteinTargetPercent);

  if (lowIntake && (input.previousDayHadLowIntake || input.hasHighRiskClinicalNote)) {
    return "VERMELHO";
  }

  if (lowIntake) {
    return "LARANJA";
  }

  if (input.kcalTargetPercent < 75 || input.proteinTargetPercent < 75) {
    return "AMARELO";
  }

  return "VERDE";
};

export const buildDailySummary = (input: DailySummaryInput) => {
  const totals = calculateDailyTotals(input.items);
  const kcalTargetPercent = calculateTargetPercent(totals.totalConsumedKcal, input.kcalTarget);
  const proteinTargetPercent = calculateTargetPercent(totals.totalConsumedProtein, input.proteinTarget);

  return {
    admissionId: input.admissionId,
    date: input.date,
    totalServedKcal: totals.totalServedKcal,
    totalConsumedKcal: totals.totalConsumedKcal,
    totalServedProtein: totals.totalServedProtein,
    totalConsumedProtein: totals.totalConsumedProtein,
    kcalTarget: input.kcalTarget,
    kcalTargetPercent,
    proteinTarget: input.proteinTarget,
    proteinTargetPercent,
    missingMealsCount: input.missingCriticalMealsCount,
    alertLevel: generateDailyAlert({
      kcalTargetPercent,
      proteinTargetPercent,
      missingCriticalMealsCount: input.missingCriticalMealsCount,
      hasInadequatePhotoWithoutReview: input.hasInadequatePhotoWithoutReview,
      previousDayHadLowIntake: input.previousDayHadLowIntake,
      hasHighRiskClinicalNote: input.hasHighRiskClinicalNote,
    }),
  };
};
