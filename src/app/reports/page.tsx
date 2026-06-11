import { CopyableReport } from "@/components/CopyableReport";
import { AppShell } from "@/components/AppShell";
import { MealNutrientReport, mealReportLabels } from "@/components/MealNutrientReport";
import { NutritionProgress } from "@/components/NutritionProgress";
import { StatusBadge } from "@/components/StatusBadge";
import { requireUser } from "@/lib/auth/session";
import { buildMealNutrientReport, type MealNutrientReport as MealNutrientReportData, type MealNutrientReportRow } from "@/lib/clinical/calculations";
import { addDays, formatDate, startOfLocalDay, toDateInputValue } from "@/lib/dates";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const buildReportText = ({
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

const buildMealReportText = ({ date, report }: { date: Date; report: MealNutrientReportData }) => {
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

  return `Resumo nutricional oral em ${formatDate(date)}: ingesta total estimada de ${report.total.totalConsumedKcal.toFixed(0)} kcal, ${report.total.totalConsumedCarbs.toFixed(1)} g de carboidratos, ${report.total.totalConsumedProtein.toFixed(1)} g de proteinas e ${report.total.totalConsumedFat.toFixed(1)} g de lipidios. ${lowestKcalText}${lowestProteinText}${highestKcalText}${highestProteinText}Dados revisados utilizados quando disponiveis.`;
};

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ admissionId?: string; date?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const admissions = await db.admission.findMany({ where: { active: true }, include: { bed: true, patient: true }, orderBy: { bed: { name: "asc" } } });
  const selectedAdmissionId = params.admissionId ?? admissions[0]?.id;
  const selectedDate = params.date ? startOfLocalDay(new Date(`${params.date}T00:00:00`)) : startOfLocalDay();
  const nextDate = addDays(selectedDate, 1);

  const [summary, meals] = selectedAdmissionId
    ? await Promise.all([
        db.nutritionDailySummary.findUnique({ where: { admissionId_date: { admissionId: selectedAdmissionId, date: selectedDate } } }),
        db.meal.findMany({
          where: { admissionId: selectedAdmissionId, date: { gte: selectedDate, lt: nextDate } },
          include: { items: true },
        }),
      ])
    : [null, []];

  const activeMeals = meals.filter((meal) => meal.status !== "CANCELADA");
  const mealNutrientReport = buildMealNutrientReport(activeMeals);
  const completeMeals = activeMeals.filter((meal) => meal.status === "FINALIZADA" || meal.status === "REVISADA").length;
  const reviewedMeals = activeMeals.filter((meal) => meal.status === "REVISADA").length;
  const reportText = summary
    ? buildReportText({
        kcal: summary.totalConsumedKcal,
        protein: summary.totalConsumedProtein,
        kcalPercent: summary.kcalTargetPercent,
        proteinPercent: summary.proteinTargetPercent,
        completeMeals,
        reviewedMeals,
        totalMeals: activeMeals.length,
        alertLevel: summary.alertLevel,
      })
    : "Sem resumo nutricional gerado para o periodo selecionado.";
  const mealReportText = buildMealReportText({ date: selectedDate, report: mealNutrientReport });

  return (
    <AppShell user={user}>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold">Relatorio nutricional</h1>
        <p className="mt-1 text-sm text-stone-600">Saida consolidada da ingesta registrada, com texto copiavel para prontuario.</p>
      </div>

      {admissions.length > 0 ? (
        <form className="mb-5 grid gap-3 rounded-md border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/50 md:grid-cols-[2fr_1fr_auto]">
          <select name="admissionId" defaultValue={selectedAdmissionId} className="rounded-md border border-stone-300 px-3 py-2">
            {admissions.map((admission) => (
              <option key={admission.id} value={admission.id}>
                {admission.bed.name} - {admission.patient.internalCode}
              </option>
            ))}
          </select>
          <input name="date" type="date" defaultValue={toDateInputValue(selectedDate)} className="rounded-md border border-stone-300 px-3 py-2" />
          <button className="rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-900">Gerar</button>
        </form>
      ) : (
        <div className="mb-5 rounded-md border border-stone-200 bg-white p-6 text-sm text-stone-600 shadow-sm shadow-stone-200/50">
          Nenhuma admissao ativa para gerar relatorio.
        </div>
      )}

      {summary ? (
        <div className="mb-5 rounded-md border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Resumo de {formatDate(summary.date)}</h2>
              <p className="text-sm text-stone-600">{summary.totalConsumedKcal.toFixed(0)} kcal · {summary.totalConsumedProtein.toFixed(1)} g proteina</p>
            </div>
            <StatusBadge level={summary.alertLevel} />
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <NutritionProgress
              label="Meta calorica"
              consumed={summary.totalConsumedKcal}
              target={summary.kcalTarget}
              percent={summary.kcalTargetPercent}
              unit="kcal"
              tone="kcal"
            />
            <NutritionProgress
              label="Meta proteica"
              consumed={summary.totalConsumedProtein}
              target={summary.proteinTarget}
              percent={summary.proteinTargetPercent}
              unit="g"
              precision={1}
              tone="protein"
            />
          </div>
        </div>
      ) : null}
      {selectedAdmissionId && !summary ? (
        <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Sem resumo nutricional gerado para a data selecionada. Registre uma refeicao ou rode o seed demo.
        </div>
      ) : null}

      <section className="mb-5 space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Relatorio por refeicao</h2>
          <p className="mt-1 text-sm text-stone-600">Distribuicao diaria de kcal, carboidratos, proteina e lipidios por ingesta registrada.</p>
        </div>
        <MealNutrientReport report={mealNutrientReport} />
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        {selectedAdmissionId ? <CopyableReport admissionId={selectedAdmissionId} text={reportText} title="Texto do resumo diario" /> : null}
        {selectedAdmissionId ? <CopyableReport admissionId={selectedAdmissionId} text={mealReportText} title="Texto do relatorio por refeicao" /> : null}
      </div>
    </AppShell>
  );
}
