import { FileSpreadsheet, FileText } from "lucide-react";
import { AccessRestricted } from "@/components/AccessRestricted";
import { CopyableReport } from "@/components/CopyableReport";
import { AppShell } from "@/components/AppShell";
import { MealNutrientReport } from "@/components/MealNutrientReport";
import { NutritionProgress } from "@/components/NutritionProgress";
import { StatusBadge } from "@/components/StatusBadge";
import { canExportPatientReports, canViewReports, defaultRouteForRole } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { buildMealNutrientReport } from "@/lib/clinical/calculations";
import { addDays, formatDate, parseDateInputValue, startOfLocalDay, toDateInputValue } from "@/lib/dates";
import { db } from "@/lib/db";
import { buildDailyReportText, buildMealReportText } from "@/lib/reporting/nutritionReport";

export const dynamic = "force-dynamic";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ admissionId?: string; date?: string }> }) {
  const user = await requireUser();
  if (!canViewReports(user.role)) {
    return (
      <AppShell user={user}>
        <AccessRestricted
          description="Relatorios nutricionais e textos para prontuario ficam disponiveis apenas para perfis clinicos autorizados."
          href={defaultRouteForRole(user.role)}
        />
      </AppShell>
    );
  }

  const params = await searchParams;
  const admissions = await db.admission.findMany({ where: { active: true }, include: { bed: true, patient: true }, orderBy: { bed: { name: "asc" } } });
  const selectedAdmissionId = params.admissionId ?? admissions[0]?.id;
  const selectedDate = parseDateInputValue(params.date) ?? startOfLocalDay();
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
    ? buildDailyReportText({
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
  const exportDate = toDateInputValue(selectedDate);
  const patientReportExportHref = selectedAdmissionId
    ? `/api/exports/patient-report?admissionId=${encodeURIComponent(selectedAdmissionId)}&date=${encodeURIComponent(exportDate)}`
    : null;

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

      {patientReportExportHref && canExportPatientReports(user.role) ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/50">
          <div>
            <h2 className="font-semibold">Exportacao local auditavel</h2>
            <p className="mt-1 text-sm text-stone-600">Baixe o resumo diario e o relatorio por paciente sem envio para Google Sheets.</p>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <a
              href={`${patientReportExportHref}&format=xlsx`}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-emerald-700 bg-white px-3 py-2 text-sm font-semibold text-emerald-900 transition-colors hover:bg-emerald-50 sm:flex-none"
            >
              <FileSpreadsheet className="h-4 w-4" /> Exportar XLSX
            </a>
            <a
              href={`${patientReportExportHref}&format=pdf`}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-800 transition-colors hover:bg-stone-50 sm:flex-none"
            >
              <FileText className="h-4 w-4" /> Exportar PDF
            </a>
          </div>
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
