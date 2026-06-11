import type { MealNutrientReport as MealNutrientReportData, MealNutrientReportRow } from "@/lib/clinical/calculations";
import { cn } from "@/lib/ui/cn";

const mealReportLabels: Record<MealNutrientReportRow["mealType"], string> = {
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

const observationLabels = (row: MealNutrientReportRow) => {
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

const formatNumber = (value: number, precision = 0) => value.toFixed(precision);

export function MealNutrientReport({ report }: { report: MealNutrientReportData }) {
  const rows = [...report.rows, report.total];

  return (
    <div className="overflow-x-auto rounded-md border border-stone-200 bg-white shadow-sm shadow-stone-200/50">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="border-b border-stone-200 bg-stone-100/80 text-xs uppercase text-stone-500">
          <tr>
            <th className="px-4 py-3">Refeicao</th>
            <th className="px-3 py-3 text-right">kcal</th>
            <th className="px-3 py-3 text-right">% kcal do dia</th>
            <th className="px-3 py-3 text-right">CHO (g)</th>
            <th className="px-3 py-3 text-right">PTN (g)</th>
            <th className="px-3 py-3 text-right">LIP (g)</th>
            <th className="px-4 py-3">Observacao</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.mealType}
              className={cn(
                "border-b border-stone-100 align-top",
                row.mealType === "TOTAL" && "bg-stone-950 text-white",
                row.mealType !== "TOTAL" && row.isLowestKcal && "bg-amber-50",
                row.mealType !== "TOTAL" && row.isLowestProtein && "outline outline-1 outline-sky-200",
              )}
            >
              <td className={cn("px-4 py-3 font-semibold", row.mealType === "TOTAL" ? "text-white" : "text-stone-950")}>
                {mealReportLabels[row.mealType]}
              </td>
              <td className="px-3 py-3 text-right">{formatNumber(row.totalConsumedKcal)}</td>
              <td className="px-3 py-3 text-right">{row.hasRecord || row.mealType === "TOTAL" ? `${formatNumber(row.kcalPercentOfDay)}%` : "-"}</td>
              <td className="px-3 py-3 text-right">{formatNumber(row.totalConsumedCarbs, 1)}</td>
              <td className="px-3 py-3 text-right">{formatNumber(row.totalConsumedProtein, 1)}</td>
              <td className="px-3 py-3 text-right">{formatNumber(row.totalConsumedFat, 1)}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1.5">
                  {observationLabels(row).map((observation) => (
                    <span
                      key={observation}
                      className={cn(
                        "rounded-md border px-2 py-1 text-xs font-semibold",
                        row.mealType === "TOTAL"
                          ? "border-white/20 bg-white/10 text-white"
                          : observation.includes("menor")
                            ? "border-amber-200 bg-amber-100 text-amber-900"
                            : observation.includes("maior")
                              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                              : observation.includes("pendente") || observation.includes("sem registro")
                                ? "border-slate-200 bg-slate-100 text-slate-800"
                                : observation.includes("revisada")
                                  ? "border-sky-200 bg-sky-50 text-sky-900"
                                  : "border-stone-200 bg-white text-stone-700",
                      )}
                    >
                      {observation}
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { mealReportLabels };
