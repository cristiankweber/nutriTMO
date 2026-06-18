import type { MealNutrientReport as MealNutrientReportData } from "@/lib/clinical/calculations";
import { buildMealObservationLabels, mealReportLabels } from "@/lib/reporting/nutritionReport";
import { cn } from "@/lib/ui/cn";

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
                  {buildMealObservationLabels(row).map((observation) => (
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
