import Link from "next/link";
import { Camera, ClipboardPlus, FileSpreadsheet, FileText } from "lucide-react";
import { AccessRestricted } from "@/components/AccessRestricted";
import { AppShell } from "@/components/AppShell";
import { mealReportLabels } from "@/components/MealNutrientReport";
import { MealPhotos } from "@/components/MealPhotos";
import { NutritionProgress } from "@/components/NutritionProgress";
import { StatusBadge } from "@/components/StatusBadge";
import { cancelMealAction } from "@/lib/actions";
import { canExportPatientReports, canRegisterMeals, canReviewMeals, canViewClinicalRecord } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { buildMealNutrientReport } from "@/lib/clinical/calculations";
import { formatDate, formatDateTime, localDayRange, toDateInputValue } from "@/lib/dates";
import { db } from "@/lib/db";
import { mealStatusLabels, mealTypeLabels, transplantTypeLabels } from "@/lib/labels";
import { getReviewMetadataFromLog, reviewReasonLabels } from "@/lib/review/rules";
import { getDisplayTransplantDay } from "@/lib/transplantDay";

export const dynamic = "force-dynamic";

type MealAuditLog = {
  id: string;
  entityId: string;
  createdAt: Date;
  action: string;
  beforeJson: unknown;
  afterJson: unknown;
  user: { name: string } | null;
};

export default async function PatientAdmissionPage({
  params,
  searchParams,
}: {
  params: Promise<{ admissionId: string }>;
  searchParams: Promise<{ admissao?: string; cancelada?: string; refeicao?: string }>;
}) {
  const user = await requireUser();
  if (!canViewClinicalRecord(user.role)) {
    return (
      <AppShell user={user}>
        <AccessRestricted
          description="O detalhe da admissao contem informacoes clinicas e imagens locais. Use Auditoria ou Governanca para revisao sem acesso assistencial."
          href="/audit"
          cta="Ir para Auditoria"
        />
      </AppShell>
    );
  }

  const { admissionId } = await params;
  const feedback = await searchParams;
  const { start: today, end: tomorrow } = localDayRange();
  const admission = await db.admission.findUnique({
    where: { id: admissionId },
    include: {
      bed: true,
      patient: true,
      prescriptions: { orderBy: { date: "desc" }, include: { createdBy: true, reviewedBy: true } },
      summaries: { orderBy: { date: "desc" }, take: 14 },
      meals: {
        where: { date: { gte: today, lt: tomorrow } },
        include: { items: { include: { foodItem: true } }, images: true, createdBy: true, reviewedBy: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!admission) throw new Error("Admissao nao encontrada.");
  const mealIds = admission.meals.map((meal) => meal.id);
  const mealLogs =
    mealIds.length > 0
      ? await db.auditLog.findMany({
          where: { entityType: "Meal", entityId: { in: mealIds }, action: { in: ["REVIEW", "UPDATE"] } },
          include: { user: true },
          orderBy: { createdAt: "desc" },
        })
      : [];
  const latestReviewLogByMeal = new Map(mealLogs.filter((log) => log.action === "REVIEW").map((log) => [log.entityId, log]));
  const latestCancellationLogByMeal = new Map(mealLogs.filter(isCancellationLog).map((log) => [log.entityId, log]));
  const currentPrescription = admission.prescriptions.find((prescription) => prescription.date.getTime() <= today.getTime());
  const todaySummary = admission.summaries.find((summary) => summary.date.getTime() === today.getTime());
  const mealNutrientReport = buildMealNutrientReport(admission.meals);
  const canCancelMeal = canReviewMeals(user.role);
  const canRegisterMeal = canRegisterMeals(user.role);
  const canExportReport = canExportPatientReports(user.role);
  const displayTransplantDay = getDisplayTransplantDay(admission.transplantDay, admission.admissionDate, today) ?? "D+ nao informado";
  const patientReportExportHref = `/api/exports/patient-report?admissionId=${encodeURIComponent(admissionId)}&date=${encodeURIComponent(toDateInputValue(today))}`;

  return (
    <AppShell user={user}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            {admission.bed.name} · {admission.patient.internalCode}
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            {transplantTypeLabels[admission.transplantType]} · {displayTransplantDay} · admissao demo em {formatDate(admission.admissionDate)}
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          {canExportReport ? (
            <>
              <a
                href={`${patientReportExportHref}&format=xlsx`}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-emerald-700 bg-white px-3 py-2 text-sm font-semibold text-emerald-900 transition-colors hover:bg-emerald-50 sm:flex-none"
              >
                <FileSpreadsheet className="h-4 w-4" /> XLSX
              </a>
              <a
                href={`${patientReportExportHref}&format=pdf`}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-800 transition-colors hover:bg-stone-50 sm:flex-none"
              >
                <FileText className="h-4 w-4" /> PDF
              </a>
            </>
          ) : null}
          {canRegisterMeal ? (
            <Link href="/meals/new" className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-900 sm:w-auto">
              <ClipboardPlus className="h-4 w-4" /> Registrar ingesta
            </Link>
          ) : null}
        </div>
      </div>

      {feedback.admissao ? (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
          Admissao criada com dados ficticios/pseudonimizados.
        </div>
      ) : null}
      {feedback.refeicao ? (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
          Ingesta registrada, resumo diario recalculado e auditoria atualizada.
        </div>
      ) : null}
      {feedback.cancelada ? (
        <div className="mb-4 rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-900">
          Refeicao cancelada sem exclusao de dados; historico e auditoria preservados.
        </div>
      ) : null}

      <div className="mb-5 grid gap-3 lg:grid-cols-4">
        <div className="rounded-md border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/50">
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
        <div className="rounded-md border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/50 lg:col-span-2">
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
        <div className="rounded-md border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/50">
          <h2 className="font-semibold">Observacoes clinicas</h2>
          <p className="mt-3 text-sm text-stone-600">{admission.clinicalNotes ?? "Nenhuma observacao clinica registrada no demo."}</p>
        </div>
      </div>

      <section className="mb-5 rounded-md border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/50">
        <h2 className="mb-3 text-lg font-semibold">Evolucao diaria</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-100/80 text-xs uppercase text-stone-500">
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
        {admission.summaries.length === 0 ? (
          <p className="mt-3 text-sm text-stone-600">Sem evolucao diaria registrada para esta admissao.</p>
        ) : null}
      </section>

      <section className="mb-5 rounded-md border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/50">
        <h2 className="text-lg font-semibold">Distribuicao por refeicao hoje</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {mealNutrientReport.rows.map((row) => (
            <div key={row.mealType} className="rounded-md border border-stone-200 bg-stone-50/80 p-3 text-sm">
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
        <h2 className="text-lg font-semibold">Ingestas registradas hoje</h2>
        {admission.meals.map((meal) => (
          <div key={meal.id} className="rounded-md border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/50">
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
                <div key={item.id} className="rounded-md border border-stone-200 bg-stone-50/80 p-3 text-sm">
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
            {meal.status === "CANCELADA" ? (
              <CancellationHistoryPanel
                log={latestCancellationLogByMeal.get(meal.id)}
                fallbackReviewer={meal.reviewedBy?.name ?? null}
                fallbackReason={meal.notes}
              />
            ) : null}
            {canCancelMeal && meal.status !== "CANCELADA" ? (
              <form action={cancelMealAction} className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-stone-200 bg-stone-50/80 p-3">
                <input type="hidden" name="mealId" value={meal.id} />
                <input
                  name="cancelReason"
                  placeholder="Motivo do cancelamento"
                  className="min-w-52 flex-1 rounded-md border border-stone-300 px-3 py-2 text-sm"
                />
                <button className="w-full rounded-md border border-rose-300 bg-white px-3 py-2 text-sm font-semibold text-rose-800 transition-colors hover:bg-rose-50 sm:w-auto">
                  Cancelar registro
                </button>
              </form>
            ) : null}
          </div>
        ))}
        {admission.meals.length === 0 ? (
          <div className="rounded-md border border-stone-200 bg-white p-6 text-sm text-stone-600 shadow-sm shadow-stone-200/50">
            Nenhuma ingesta registrada hoje para esta admissao.
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}

function ReviewHistoryPanel({
  log,
  fallbackReviewer,
}: {
  log: MealAuditLog | undefined;
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

function CancellationHistoryPanel({
  log,
  fallbackReviewer,
  fallbackReason,
}: {
  log: MealAuditLog | undefined;
  fallbackReviewer: string | null;
  fallbackReason: string | null;
}) {
  const reason = getCancellationReason(log?.afterJson) ?? fallbackReason ?? "Motivo nao registrado.";

  return (
    <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-rose-950">Historico auditavel do cancelamento</div>
          <div className="mt-1 text-rose-900">
            Cancelada por {log?.user?.name ?? fallbackReviewer ?? "usuario nao identificado"}
            {log ? ` em ${formatDateTime(log.createdAt)}` : ""}
          </div>
        </div>
        {log ? <span className="rounded-md bg-white px-2 py-1 text-xs font-mono text-rose-900">AuditLog {log.id}</span> : null}
      </div>
      <p className="mt-2 text-rose-900">Motivo: {reason}</p>
    </div>
  );
}

function isCancellationLog(log: MealAuditLog) {
  const after = asRecord(log.afterJson);
  return log.action === "UPDATE" && (after?.status === "CANCELADA" || typeof after?.cancellationReason === "string");
}

const getCancellationReason = (value: unknown) => {
  const record = asRecord(value);
  const reason = record?.cancellationReason ?? record?.notes;
  return typeof reason === "string" && reason.trim() ? reason : null;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

const getStatusFromJson = (value: unknown) => {
  const record = asRecord(value);
  const status = record?.status;
  return typeof status === "string" ? mealStatusLabels[status as keyof typeof mealStatusLabels] ?? status : null;
};
