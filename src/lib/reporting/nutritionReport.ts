import type { MealNutrientReport, MealNutrientReportRow } from "@/lib/clinical/calculations";
import { formatDate } from "@/lib/dates";

export const mealReportLabels: Record<MealNutrientReportRow["mealType"], string> = {
  CAFE_MANHA: "Cafe da manha",
  LANCHE_MANHA: "Lanche da manha",
  ALMOCO: "Almoco",
  LANCHE_TARDE: "Lanche da tarde",
  JANTAR: "Janta",
  CEIA: "Ceia",
  SUPLEMENTO: "Suplementos",
  OUTRO: "Outros",
  TOTAL: "Total",
};

export const buildMealObservationLabels = (row: MealNutrientReportRow) => {
  if (row.mealType === "TOTAL") return ["total diario"];
  const observations: string[] = [];
  if (!row.hasRecord) observations.push("refeicao sem registro");
  if (row.isPending) observations.push("refeicao pendente");
  if (row.isReviewed) observations.push("refeicao revisada");
  if (row.isLowestKcal) observations.push("menor kcal do dia");
  if (row.isLowestProtein) observations.push("menor proteina do dia");
  if (row.isHighestKcal) observations.push("maior aporte calorico");
  if (row.isHighestProtein) observations.push("maior aporte proteico");
  return observations.length > 0 ? observations : ["registro completo"];
};

export const buildDailyReportText = ({
  kcal,
  protein,
  kcalPercent,
  proteinPercent,
  completeMeals,
  reviewedMeals,
  totalMeals,
  alertLevel,
}: {
  kcal: number;
  protein: number;
  kcalPercent: number;
  proteinPercent: number;
  completeMeals: number;
  reviewedMeals: number;
  totalMeals: number;
  alertLevel: string;
}) => {
  const alertTextByLevel: Record<string, string> = {
    VERMELHO: "Alerta vermelho por baixa ingesta persistente. ",
    LARANJA: "Alerta laranja por baixa ingesta nas ultimas 24h. ",
    AMARELO: "Alerta amarelo no resumo nutricional. ",
    CINZA: "Ha pendencia de qualidade ou completude do registro. ",
    VERDE: "",
  };
  const mealText =
    totalMeals > 0
      ? `Registros do periodo: ${completeMeals}/${totalMeals} refeicao(oes) completas e ${reviewedMeals}/${totalMeals} revisada(s) pela nutricao.`
      : "Sem refeicoes registradas no periodo.";
  return `Resumo nutricional do periodo selecionado: ingesta oral registrada de ${kcal.toFixed(0)} kcal e ${protein.toFixed(1)} g de proteina, correspondendo a ${kcalPercent.toFixed(0)}% da meta calorica e ${proteinPercent.toFixed(0)}% da meta proteica. Dados revisados foram utilizados quando disponiveis. ${alertTextByLevel[alertLevel] ?? ""}${mealText} Sugere-se reavaliacao nutricional conforme julgamento clinico.`;
};

const mealName = (row: MealNutrientReportRow | null) => (row ? mealReportLabels[row.mealType].toLowerCase() : null);

export const buildMealReportText = ({ date, report }: { date: Date; report: MealNutrientReport }) => {
  if (!report.total.hasRecord) {
    return `Resumo nutricional oral em ${formatDate(date)}: sem refeicoes registradas no periodo selecionado. Dados revisados utilizados quando disponiveis.`;
  }

  const lowestKcalName = mealName(report.lowestKcalMeal);
  const lowestProteinName = mealName(report.lowestProteinMeal);
  const highestKcalName = mealName(report.highestKcalMeal);
  const highestProteinName = mealName(report.highestProteinMeal);

  const lowestKcalText = report.lowestKcalMeal && lowestKcalName
    ? `A menor ingesta calorica ocorreu na refeicao ${lowestKcalName}, com ${report.lowestKcalMeal.totalConsumedKcal.toFixed(0)} kcal. `
    : "";
  const lowestProteinText = report.lowestProteinMeal && lowestProteinName
    ? `A menor ingesta proteica ocorreu na refeicao ${lowestProteinName}, com ${report.lowestProteinMeal.totalConsumedProtein.toFixed(1)} g de proteina. `
    : "";
  const highestKcalText = report.highestKcalMeal && highestKcalName
    ? `O maior aporte calorico ocorreu na refeicao ${highestKcalName}, com ${report.highestKcalMeal.totalConsumedKcal.toFixed(0)} kcal. `
    : "";
  const highestProteinText = report.highestProteinMeal && highestProteinName
    ? `O maior aporte proteico ocorreu na refeicao ${highestProteinName}, com ${report.highestProteinMeal.totalConsumedProtein.toFixed(1)} g de proteina. `
    : "";

  return `Resumo nutricional oral em ${formatDate(date)}: ingesta total estimada de ${report.total.totalConsumedKcal.toFixed(0)} kcal, ${report.total.totalConsumedCarbs.toFixed(1)} g de carboidratos, ${report.total.totalConsumedProtein.toFixed(1)} g de proteinas, ${report.total.totalConsumedFat.toFixed(1)} g de lipidios e ${report.total.totalConsumedSodium.toFixed(0)} mg de sodio. ${lowestKcalText}${lowestProteinText}${highestKcalText}${highestProteinText}Dados revisados utilizados quando disponiveis.`;
};

export const getMealReportRows = (report: MealNutrientReport) =>
  [...report.rows, report.total].map((row) => ({
    ...row,
    label: mealReportLabels[row.mealType],
    observations: buildMealObservationLabels(row),
  }));
