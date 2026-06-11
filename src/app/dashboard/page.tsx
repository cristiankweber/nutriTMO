import Link from "next/link";
import { ClipboardPlus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { DashboardBedGrid, type DashboardBedCardData } from "@/components/DashboardBedGrid";
import { MetricCard } from "@/components/MetricCard";
import { requireUser } from "@/lib/auth/session";
import { buildMealNutrientReport } from "@/lib/clinical/calculations";
import { startOfLocalDay } from "@/lib/dates";
import { db } from "@/lib/db";
import { isMealOperationallyIncomplete, isMealPendingReview, isNutritionAlertLevel } from "@/lib/review/rules";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const today = startOfLocalDay();
  const [beds, admissions, summaries] = await Promise.all([
    db.bed.findMany({ orderBy: { name: "asc" } }),
    db.admission.findMany({
      where: { active: true },
      include: {
        bed: true,
        patient: true,
        prescriptions: { orderBy: { date: "desc" }, take: 1 },
        meals: { where: { date: { gte: today } }, include: { items: true } },
      },
      orderBy: { bed: { name: "asc" } },
    }),
    db.nutritionDailySummary.findMany({ where: { date: today } }),
  ]);

  const admissionByBed = new Map(admissions.map((admission) => [admission.bedId, admission]));
  const summaryByAdmission = new Map(summaries.map((summary) => [summary.admissionId, summary]));
  const occupied = admissions.length;
  const openReviewCount = admissions.reduce((sum, admission) => sum + admission.meals.filter(isMealPendingReview).length, 0);
  const unfinishedMealCount = admissions.reduce((sum, admission) => sum + admission.meals.filter(isMealOperationallyIncomplete).length, 0);
  const missingCriticalMealsCount = summaries.reduce((sum, summary) => sum + summary.missingMealsCount, 0);
  const nutritionAlertCount = summaries.filter((summary) => isNutritionAlertLevel(summary.alertLevel)).length;
  const bedCards: DashboardBedCardData[] = beds.map((bed) => {
    const admission = admissionByBed.get(bed.id);
    const summary = admission ? summaryByAdmission.get(admission.id) : null;
    const prescription = admission?.prescriptions[0];
    const pendingMeals = admission?.meals.filter(isMealPendingReview).length ?? 0;
    const operationalPendingMeals = admission?.meals.filter(isMealOperationallyIncomplete).length ?? 0;
    const mealNutrientReport = admission ? buildMealNutrientReport(admission.meals) : null;
    const missingLunch = Boolean(mealNutrientReport?.rows.find((row) => row.mealType === "ALMOCO" && !row.hasRecord));

    return {
      bedId: bed.id,
      bedName: bed.name,
      admissionId: admission?.id ?? null,
      patientCode: admission?.patient.internalCode ?? null,
      transplantDay: admission?.transplantDay ?? null,
      dietType: prescription?.dietType ?? null,
      summary: summary
        ? {
            alertLevel: summary.alertLevel,
            totalConsumedKcal: summary.totalConsumedKcal,
            kcalTarget: summary.kcalTarget,
            kcalTargetPercent: summary.kcalTargetPercent,
            totalConsumedProtein: summary.totalConsumedProtein,
            proteinTarget: summary.proteinTarget,
            proteinTargetPercent: summary.proteinTargetPercent,
          }
        : null,
      mealTypes: admission?.meals.map((meal) => meal.mealType) ?? [],
      pendingMeals,
      operationalPendingMeals,
      missingLunch,
      lowestKcalMeal: mealNutrientReport?.lowestKcalMeal?.mealType ?? null,
      lowestProteinMeal: mealNutrientReport?.lowestProteinMeal?.mealType ?? null,
      hasNutritionAlert: summary ? isNutritionAlertLevel(summary.alertLevel) : false,
      hasReview: pendingMeals > 0,
      hasOperationalPending: operationalPendingMeals > 0 || (summary?.missingMealsCount ?? 0) > 0,
      isFree: !admission,
    };
  });

  return (
    <AppShell user={user}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard da unidade</h1>
          <p className="mt-1 text-sm text-stone-600">Leitos TMO, ingesta registrada do dia e pendencias de revisao humana.</p>
        </div>
        <Link href="/meals/new" className="inline-flex items-center gap-2 rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900">
          <ClipboardPlus className="h-4 w-4" /> Registrar ingesta
        </Link>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Leitos ocupados" value={`${occupied}/10`} detail="Admissoes ativas no TMO" />
        <MetricCard label="Alertas nutricionais" value={`${nutritionAlertCount}`} detail="Baixa ingesta ou risco explicito" />
        <MetricCard label="Revisoes abertas" value={`${openReviewCount}`} detail="Foto, confianca ou correcao" />
        <MetricCard label="Pendencias do dia" value={`${missingCriticalMealsCount + unfinishedMealCount}`} detail="Critica ausente ou incompleta" />
        <MetricCard label="Registros hoje" value={`${admissions.reduce((sum, admission) => sum + admission.meals.length, 0)}`} detail="Ingesta oral e suplementos" />
      </div>

      <DashboardBedGrid cards={bedCards} />
    </AppShell>
  );
}
