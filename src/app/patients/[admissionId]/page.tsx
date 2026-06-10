import Link from "next/link";
import { Camera, ClipboardPlus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { mealReportLabels } from "@/components/MealNutrientReport";
import { MealPhotos } from "@/components/MealPhotos";
import { NutritionProgress } from "@/components/NutritionProgress";
import { StatusBadge } from "@/components/StatusBadge";
import { cancelMealAction } from "@/lib/actions";
import { canReviewMeals } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { buildMealNutrientReport } from "@/lib/clinical/calculations";
import { formatDate, formatDateTime, startOfLocalDay } from "@/lib/dates";
import { db } from "@/lib/db";
import { mealStatusLabels, mealTypeLabels, transplantTypeLabels } from "@/lib/labels";
import { getReviewMetadataFromLog, reviewReasonLabels } from "@/lib/review/rules";

export const dynamic = "force-dynamic";

type ReviewLog = {
  id: string;
  createdAt: Date;
  beforeJson: unknown;
  afterJson: unknown;
  user: { name: string } | null;
};

export default async function PatientAdmissionPage({ params }: { params: Promise<{ admissionId: string }> }) {
  const user = await requireUser();
  const { admissionId } = await params;
  const today = startOfLocalDay();
  const admission = await db.admission.findUnique({
    where: { id: admissionId },
    include: {
      bed: true,
      patient: true,
      prescriptions: { orderBy: { date: "desc" }, include: { createdBy: true, reviewedBy: true } },
      summaries: { orderBy: { date: "desc" }, take: 14 },
      meals: {
        where: { date: { gte: today } },
        include: { items: { include: { foodItem: true } }, images: true, createdBy: true, reviewedBy: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!admission) throw new Error("Admissao nao encontrada.");
  const mealIds = admission.meals.map((meal) => meal.id);
  const reviewLogs =
    mealIds.length > 0
      ? await db.auditLog.findMany({
          where: { entityType: "Meal", action: "REVIEW", entityId: { in: mealIds } },
          include: { user: true },
          orderBy: { createdAt: "desc" },
        })
      : [];
  const latestReviewLogByMeal = new Map(reviewLogs.map((log) => [log.entityId, log]));
  const currentPrescription = admission.prescriptions[0];
  const todaySummary = admission.summaries.find((summary) => summary.date.getTime() === today.getTime());
  const mealNutrientReport = buildMealNutrientReport(admission.meals);
  const canCancelMeal = canReviewMeals(user.role);

  return (
    <AppShell user={user}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            {admission.bed.name} · {admission.patient.internalCode}
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            {transplantTypeLabels[admission.transplantType]} · {admission.transplantDay ?? "D+ nao informado"} · admissao demo em {formatDate(admission.admissionDate)}
          </p>
        </div>
        <Link href="/meals/new" className="inline-flex items-center gap-2 rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900">
          <ClipboardPlus className="h-4 w-4" /> Registrar refeicao
        </Link>
      </div>

      <div className="mb-5 grid gap-3 lg:grid-cols-4">
        <div className="rounded-md border border-stone-200 bg-white p-4">
          <h2 className="font-semibold">Prescricao ativa</h2>
          {currentPrescription ? (
            <div className="mt-3 space-y-2 text-sm">
              <div>{currentPrescription.dietType} · {currentPrescription.consistency}</div>
              <div>{currentPrescription.kcalTarget.toFixed(0)} kcal/dia · {currentPrescription.proteinTarget.toFixed(1)} g proteina/dia</div>
              <div className="text-stone-600">{currentPrescription.supplementsPlan ?? "Sem plano de suplemento registrado."}</div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-stone-600">Sem prescricao ativa.</p>
          )}
        </div>
        <div className="rounded-md border border-stone-200 bg-white p-4 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">Ingesta de hoje</h2>
              <p className="mt-1 text-sm text-stone-600">Totais do resumo diario, com correcoes revisadas quando disponiveis.</p>
            </div>
            {todaySummary ? <StatusBadge level={todaySummary.alertLevel} /> : null}
          </div>
          {todaySummary ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <NutritionProgress
                label="Meta calorica"
                consumed={todaySummary.totalConsumedKcal}
                target={todaySummary.kcalTarget}
                percent={todaySummary.kcalTargetPercent}
                unit="kcal"
                tone="kcal"
              />
              <NutritionProgress
                label="Meta proteica"
                consumed={todaySummary.totalConsumedProtein}
                target={todaySummary.proteinTarget}
                percent={todaySummary.proteinTargetPercent}
                unit="g"
                precision={1}
                tone="protein"
              />
            </div>
          ) : (
            <p className="mt-3 text-sm text-stone-600">Sem resumo gerado para hoje.</p>
          )}
        </div>
        <div className="rounded-md border border-stone-200 bg-white p-4">
          <h2 className="font-semibold">Observacoes clinicas</h2>
          <p className="mt-3 text-sm text-stone-600">{admission.clinicalNotes ?? "Nenhuma observacao clinica registrada no demo."}</p>
        </div>
      </div>

      <section className="mb-5 rounded-md border border-stone-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold">Evolucao diaria</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-stone-200 text-xs uppercase text-stone-500">
              <tr>
                <th className="py-2">Data</th>
                <th>Kcal</th>
                <th>% meta kcal</th>
                <th>Proteina</th>
                <th>% meta proteina</th>
                <th>Alerta</th>
              </tr>
            </thead>
            <tbody>
              {admission.summaries.map((summary) => (
                <tr key={summary.id} className="border-b border-stone-100">
                  <td className="py-2">{formatDate(summary.date)}</td>
                  <td>{summary.totalConsumedKcal.toFixed(0)} kcal</td>
                  <td>{summary.kcalTargetPercent.toFixed(0)}%</td>
                  <td>{summary.totalConsumedProtein.toFixed(1)} g</td>
                  <td>{summary.proteinTargetPercent.toFixed(0)}%</td>
                  <td><StatusBadge level={summary.alertLevel} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-5 rounded-md border border-stone-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Distribuicao por refeicao hoje</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {mealNutrientReport.rows.map((row) => (
            <div key={row.mealType} className="rounded-md border border-stone-200 bg-stone-50 p-3 text-sm">
              <div className="font-semibold">{mealReportLabels[row.mealType]}</div>
              <div className="mt-2 text-stone-600">
                {row.hasRecord ? `${row.totalConsumedKcal.toFixed(0)} kcal · ${row.totalConsumedProtein.toFixed(1)} g proteina` : "Sem registro"}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {row.isLowestKcal ? <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">menor kcal</span> : null}
                {row.isLowestProtein ? <span className="rounded-md bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-900">menor proteina</span> : null}
                {row.isPending ? <span className="rounded-md bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-800">pendente</span> : null}
                {row.isReviewed ? <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-900">revisada</span> : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Refeicoes de hoje</h2>
        {admission.meals.map((meal) => (
          <div key={meal.id} className="rounded-md border border-stone-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-semibold">{mealTypeLabels[meal.mealType]}</div>
                <div className="text-sm text-stone-600">
                  {mealStatusLabels[meal.status]} · criado por {meal.createdBy.name}
                  {meal.reviewedBy ? ` · revisado por ${meal.reviewedBy.name}` : ""}
                </div>
              </div>
              <div className="inline-flex items-center gap-2 text-sm text-stone-600">
                <Camera className="h-4 w-4" /> {meal.images.length} imagem(ns)
              </div>
            </div>
            {meal.preMealImageUrl || meal.postMealImageUrl ? (
              <div className="mt-3">
                <MealPhotos preMealImageUrl={meal.preMealImageUrl} postMealImageUrl={meal.postMealImageUrl} />
              </div>
            ) : null}
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {meal.items.map((item) => (
                <div key={item.id} className="rounded-md bg-stone-50 p-3 text-sm">
                  <div className="font-medium">{item.foodItem.name}</div>
                  <div className="text-stone-600">
                    {item.consumedKcal.toFixed(0)} kcal · {item.consumedProtein.toFixed(1)} g proteina ingeridos
                  </div>
                  {item.notes ? <div className="mt-1 text-xs text-stone-500">Obs.: {item.notes}</div> : null}
                </div>
              ))}
            </div>
            {meal.status === "REVISADA" ? (
              <ReviewHistoryPanel
                log={latestReviewLogByMeal.get(meal.id)}
                fallbackReviewer={meal.reviewedBy?.name ?? null}
              />
            ) : null}
            {canCancelMeal && meal.status !== "CANCELADA" ? (
              <form action={cancelMealAction} className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-stone-200 bg-stone-50 p-3">
                <input type="hidden" name="mealId" value={meal.id} />
                <input
                  name="cancelReason"
                  placeholder="Motivo do cancelamento"
                  className="min-w-52 flex-1 rounded-md border border-stone-300 px-3 py-2 text-sm"
                />
                <button className="rounded-md border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-50">
                  Cancelar refeicao
                </button>
              </form>
            ) : null}
          </div>
        ))}
      </section>
    </AppShell>
  );
}

function ReviewHistoryPanel({
  log,
  fallbackReviewer,
}: {
  log: ReviewLog | undefined;
  fallbackReviewer: string | null;
}) {
  const metadata = getReviewMetadataFromLog(log?.beforeJson, log?.afterJson);
  const beforeStatus = getStatusFromJson(log?.beforeJson) ?? "Nao registrado";
  const afterStatus = getStatusFromJson(log?.afterJson) ?? "Revisada";
  const changedDiffs = metadata.percentDiffs.filter((diff) => diff.changed);

  return (
    <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-emerald-950">Historico auditavel da revisao</div>
          <div className="mt-1 text-emerald-900">
            {beforeStatus} {"->"} {afterStatus} · revisado por {log?.user?.name ?? fallbackReviewer ?? "usuario nao identificado"}
            {log ? ` em ${formatDateTime(log.createdAt)}` : ""}
          </div>
        </div>
        {log ? <span className="rounded-md bg-white px-2 py-1 text-xs font-mono text-emerald-900">AuditLog {log.id}</span> : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {metadata.reasons.map((reason) => (
          <span key={reason} className="rounded-md border border-emerald-200 bg-white px-2 py-1 text-xs font-semibold text-emerald-900">
            {reviewReasonLabels[reason]}
          </span>
        ))}
      </div>
      {metadata.observation ? <p className="mt-2 text-emerald-900">Observacao: {metadata.observation}</p> : null}
      <div className="mt-2 text-emerald-900">
        Percentuais corrigidos:{" "}
        {changedDiffs.length > 0
          ? changedDiffs.map((diff) => `${diff.beforePercent} -> ${diff.afterPercent}`).join(", ")
          : "sem mudanca de percentual registrada"}
      </div>
    </div>
  );
}

const getStatusFromJson = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const status = (value as { status?: unknown }).status;
  return typeof status === "string" ? mealStatusLabels[status as keyof typeof mealStatusLabels] ?? status : null;
};
