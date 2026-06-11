import type { ConsumedPercentValue } from "@/lib/clinical/calculations";

export type MealEstimationInput = {
  mealId: string;
  preMealImageUrl?: string | null;
  postMealImageUrl?: string | null;
  itemIds: string[];
};

export type MealEstimationOutput = {
  suggestions: Array<{
    itemId: string;
    consumedPercent: ConsumedPercentValue;
    confidence: "ALTA" | "MEDIA" | "BAIXA" | "NAO_APLICAVEL";
  }>;
  modelVersion: string;
  notes: string;
};

export const estimateMealConsumption = async (input: MealEstimationInput): Promise<MealEstimationOutput> => ({
  suggestions: input.itemIds.map((itemId) => ({
    itemId,
    consumedPercent: 50,
    confidence: "BAIXA",
  })),
  modelVersion: "mock-futuro",
  notes: "Nao usar para decisao clinica; modulo futuro para visao computacional com revisao humana obrigatoria.",
});
