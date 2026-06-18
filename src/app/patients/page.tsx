import Link from "next/link";
import { ArrowRightLeft, BedDouble, Filter, Search, UserPlus } from "lucide-react";
import { AccessRestricted } from "@/components/AccessRestricted";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { createPatientAdmissionAction, dischargeAdmissionAction, transferAdmissionBedAction } from "@/lib/actions";
import { canManagePatients } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { formatDate, startOfLocalDay, toDateInputValue } from "@/lib/dates";
import { db } from "@/lib/db";
import { transplantTypeLabels } from "@/lib/labels";
import { isNutritionAlertLevel } from "@/lib/review/rules";
import { getDisplayTransplantDay } from "@/lib/transplantDay";
import { TransplantType } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

const transplantTypes = Object.keys(transplantTypeLabels) as TransplantType[];
const patientStatusFilters = ["ativas", "alertas", "sem_prescricao", "livres", "altas", "inativos", "todos"] as const;

type PatientStatusFilter = (typeof patientStatusFilters)[number];

const statusLabels: Record<PatientStatusFilter, string> = {
  ativas: "Ativas",
  alertas: "Alertas",
  sem_prescricao: "Sem prescricao",
  livres: "Leitos livres",
  altas: "Altas",
  inativos: "Inativos",
  todos: "Todos",
};

const normalizeStatus = (value: string | undefined): PatientStatusFilter =>
  patientStatusFilters.includes(value as PatientStatusFilter) ? (value as PatientStatusFilter) : "ativas";

const includesSearch = (value: string | null | undefined, query: string) => value?.toLowerCase().includes(query) ?? false;

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ secao?: string; status?: string; q?: string }>;
}) {
  const user = await requireUser();
  const allowed = canManagePatients(user.role);
  if (!allowed) {
    return (
      <AppShell user={user}>
        <AccessRestricted description="A listagem ampla de pacientes e admissoes fica disponivel apenas para admin e nutricao. Perfis assistenciais acessam detalhes pelo dashboard." />
      </AppShell>
    );
  }

  const params = await searchParams;
  const activeStatus = normalizeStatus(params.status);
  const query = params.q?.trim().toLowerCase() ?? "";
  const today = startOfLocalDay();

  const [beds, admissions, inactivePatients] = await Promise.all([
    db.bed.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.admission.findMany({
      include: {
        bed: true,
        patient: true,
        prescriptions: { where: { date: { lte: today } }, orderBy: { date: "desc" }, take: 1 },
        summaries: { orderBy: { date: "desc" }, take: 1 },
      },
      orderBy: [{ active: "desc" }, { bed: { name: "asc" } }, { admissionDate: "desc" }],
    }),
    db.patient.findMany({
      where: { active: false },
      include: { admissions: { include: { bed: true }, orderBy: { admissionDate: "desc" }, take: 1 } },
      orderBy: { internalCode: "asc" },
    }),
  ]);

  const activeAdmissions = admissions.filter((admission) => admission.active);
  const dischargedAdmissions = admissions.filter((admission) => !admission.active);
  const occupiedBedIds = new Set(activeAdmissions.map((admission) => admission.bedId));
  const freeBeds = beds.filter((bed) => !occupiedBedIds.has(bed.id));
  const alertAdmissions = activeAdmissions.filter((admission) =>
    admission.summaries[0] ? isNutritionAlertLevel(admission.summaries[0].alertLevel) : false,
  );
  const admissionsWithoutPrescription = activeAdmissions.filter((admission) => !admission.prescriptions[0]);

  const filterCounts: Record<PatientStatusFilter, number> = {
    ativas: activeAdmissions.length,
    alertas: alertAdmissions.length,
    sem_prescricao: admissionsWithoutPrescription.length,
    livres: freeBeds.length,
    altas: dischargedAdmissions.length,
    inativos: inactivePatients.length,
    todos: admissions.length + freeBeds.length + inactivePatients.length,
  };

  const matchesAdmissionSearch = (admission: (typeof admissions)[number]) => {
    if (!query) return true;
    const displayTransplantDay = getDisplayTransplantDay(admission.transplantDay, admission.admissionDate, today);
    return (
      includesSearch(admission.patient.internalCode, query) ||
      includesSearch(admission.bed.name, query) ||
      includesSearch(displayTransplantDay, query) ||
      includesSearch(admission.transplantDay, query) ||
      includesSearch(admission.prescriptions[0]?.dietType, query)
    );
  };

  const matchesPatientSearch = (patient: (typeof inactivePatients)[number]) => {
    if (!query) return true;
    return includesSearch(patient.internalCode, query) || includesSearch(patient.admissions[0]?.bed.name, query);
  };

  const visibleActiveAdmissions = activeAdmissions
    .filter(matchesAdmissionSearch)
    .filter((admission) => {
      if (activeStatus === "alertas") return admission.summaries[0] ? isNutritionAlertLevel(admission.summaries[0].alertLevel) : false;
      if (activeStatus === "sem_prescricao") return !admission.prescriptions[0];
      return activeStatus === "ativas" || activeStatus === "todos";
    });
  const visibleDischargedAdmissions = dischargedAdmissions.filter(matchesAdmissionSearch);
  const visibleInactivePatients = inactivePatients.filter(matchesPatientSearch);
  const visibleFreeBeds = freeBeds.filter((bed) => !query || includesSearch(bed.name, query) || includesSearch(bed.unit, query));

  const showActiveAdmissions = activeStatus === "ativas" || activeStatus === "alertas" || activeStatus === "sem_prescricao" || activeStatus === "todos";
  const showFreeBeds = activeStatus === "livres" || activeStatus === "todos";
  const showDischargedAdmissions = activeStatus === "altas" || activeStatus === "todos";
  const showInactivePatients = activeStatus === "inativos" || activeStatus === "todos";

  const filterHref = (status: PatientStatusFilter) => {
    const search = new URLSearchParams({ status });
    if (query) search.set("q", query);
    return `/patients?${search.toString()}`;
  };

  return (
    <AppShell user={user}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Pacientes e admissoes</h1>
          <p className="mt-1 text-sm text-stone-600">Operacao de leitos, pacientes ativos/inativos, altas e transferencias.</p>
        </div>
        <a href="#nova-admissao" className="inline-flex items-center gap-2 rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900">
          <UserPlus className="h-4 w-4" /> Nova admissao
        </a>
      </div>

      {params.secao === "alta" ? (
        <div className="mb-4 rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-900">
          Alta registrada; paciente ficou inativo quando nao restou outra admissao ativa.
        </div>
      ) : null}
      {params.secao === "transferencia" ? (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
          Troca de leito registrada e auditada.
        </div>
      ) : null}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <OperationMetric label="Admissoes ativas" value={activeAdmissions.length} detail="Pacientes em leito TMO" />
        <OperationMetric label="Leitos livres" value={freeBeds.length} detail={`de ${beds.length} leitos ativos`} />
        <OperationMetric label="Alertas" value={alertAdmissions.length} detail="Risco nutricional ativo" />
        <OperationMetric label="Sem prescricao" value={admissionsWithoutPrescription.length} detail="Admissao ativa sem plano" />
        <OperationMetric label="Pacientes inativos" value={inactivePatients.length} detail="Sem admissao ativa" />
      </div>

      <section className="mb-5 rounded-md border border-stone-200 bg-white p-3 shadow-sm shadow-stone-200/50">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-stone-500">
            <Filter className="h-3.5 w-3.5" />
            Filtros operacionais
          </span>
          {patientStatusFilters.map((status) => (
            <Link
              key={status}
              href={filterHref(status)}
              aria-current={activeStatus === status ? "page" : undefined}
              className={`inline-flex min-h-9 items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors ${
                activeStatus === status
                  ? "border-emerald-800 bg-emerald-800 text-white"
                  : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
              }`}
            >
              {statusLabels[status]}
              <span className={`rounded-md px-1.5 py-0.5 text-xs ${activeStatus === status ? "bg-white/20" : "bg-stone-100 text-stone-600"}`}>
                {filterCounts[status]}
              </span>
            </Link>
          ))}
        </div>
        <form className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <input type="hidden" name="status" value={activeStatus} />
          <label className="relative">
            <span className="sr-only">Buscar paciente ou leito</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Buscar codigo, leito, D+ ou dieta"
              className="w-full rounded-md border border-stone-300 py-2 pl-9 pr-3 text-sm"
            />
          </label>
          <button className="inline-flex items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50">
            <Search className="h-4 w-4" /> Filtrar
          </button>
          {query ? (
            <Link href={`/patients?status=${activeStatus}`} className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50">
              Limpar
            </Link>
          ) : null}
        </form>
      </section>

      {showActiveAdmissions ? (
        <section className="mb-6">
          <h2 className="mb-3 text-lg font-semibold">Admissoes ativas ({visibleActiveAdmissions.length})</h2>
          {visibleActiveAdmissions.length === 0 ? (
            <div className="rounded-md border border-stone-200 bg-white p-6 text-sm text-stone-600 shadow-sm shadow-stone-200/50">
              Nenhuma admissao ativa encontrada para o filtro atual.
            </div>
          ) : (
            <div className="space-y-3">
              {visibleActiveAdmissions.map((admission) => (
                <ActiveAdmissionCard key={admission.id} admission={admission} freeBeds={freeBeds} referenceDate={today} />
              ))}
            </div>
          )}
        </section>
      ) : null}

      <section id="nova-admissao" className="mb-6 scroll-mt-8 rounded-md border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/50">
        <h2 className="mb-3 text-lg font-semibold">Nova admissao</h2>
        {freeBeds.length === 0 ? (
          <p className="text-sm text-stone-600">Todos os leitos ativos estao ocupados. Registre uma alta antes de admitir novo paciente.</p>
        ) : (
          <form action={createPatientAdmissionAction} className="grid gap-3 md:grid-cols-3">
            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium">Paciente</span>
              <select name="patientId" className="w-full rounded-md border border-stone-300 px-3 py-2">
                <option value="">Novo paciente pseudonimizado</option>
                {inactivePatients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    Reativar {patient.internalCode}
                  </option>
                ))}
              </select>
              <span className="block text-xs leading-5 text-stone-500">
                Para reinternar paciente inativo, selecione-o aqui e deixe o codigo novo em branco.
              </span>
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium">Codigo interno novo</span>
              <input name="internalCode" placeholder="Ex: TMO-2026-001" className="w-full rounded-md border border-stone-300 px-3 py-2" />
              <span className="block text-xs leading-5 text-stone-500">Obrigatorio apenas para paciente novo.</span>
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium">Leito</span>
              <select name="bedId" className="w-full rounded-md border border-stone-300 px-3 py-2">
                {freeBeds.map((bed) => (
                  <option key={bed.id} value={bed.id}>
                    {bed.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium">Data de admissao</span>
              <input name="admissionDate" type="date" defaultValue={toDateInputValue(new Date())} className="w-full rounded-md border border-stone-300 px-3 py-2" required />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium">Tipo de transplante</span>
              <select name="transplantType" defaultValue="NAO_INFORMADO" className="w-full rounded-md border border-stone-300 px-3 py-2">
                {transplantTypes.map((type) => (
                  <option key={type} value={type}>
                    {transplantTypeLabels[type]}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium">D+ / D- na admissao</span>
              <input name="transplantDay" placeholder="Ex: D+0 ou D-5" className="w-full rounded-md border border-stone-300 px-3 py-2" />
              <span className="block text-xs leading-5 text-stone-500">
                As telas calculam o D atual automaticamente a partir da data de admissao.
              </span>
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="text-sm font-medium">Notas clinicas</span>
              <input name="clinicalNotes" placeholder="Opcional" className="w-full rounded-md border border-stone-300 px-3 py-2" />
            </label>
            <div className="md:col-span-3">
              <button className="rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900">
                Admitir paciente
              </button>
            </div>
          </form>
        )}
      </section>

      {showFreeBeds ? (
        <section className="mb-6">
          <h2 className="mb-3 text-lg font-semibold">Leitos livres ({visibleFreeBeds.length})</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {visibleFreeBeds.map((bed) => (
              <div key={bed.id} className="rounded-md border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/50">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase text-emerald-900">
                  <BedDouble className="h-4 w-4" /> Disponivel
                </div>
                <div className="mt-3 text-xl font-semibold">{bed.name}</div>
                <div className="mt-1 text-sm text-stone-600">{bed.unit}</div>
              </div>
            ))}
          </div>
          {visibleFreeBeds.length === 0 ? (
            <div className="rounded-md border border-stone-200 bg-white p-6 text-sm text-stone-600 shadow-sm shadow-stone-200/50">
              Nenhum leito livre encontrado para o filtro atual.
            </div>
          ) : null}
        </section>
      ) : null}

      {showInactivePatients ? (
        <section className="mb-6">
          <h2 className="mb-3 text-lg font-semibold">Pacientes inativos ({visibleInactivePatients.length})</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {visibleInactivePatients.map((patient) => (
              <div key={patient.id} className="rounded-md border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/50">
                <div className="text-xs font-semibold uppercase text-stone-500">Sem admissao ativa</div>
                <div className="mt-1 text-lg font-semibold">{patient.internalCode}</div>
                <div className="mt-2 text-sm text-stone-600">
                  Ultimo leito: {patient.admissions[0]?.bed.name ?? "-"} · ultima admissao:{" "}
                  {patient.admissions[0] ? formatDate(patient.admissions[0].admissionDate) : "-"}
                </div>
                <p className="mt-3 rounded-md bg-stone-50 p-3 text-sm text-stone-600">
                  Para reinternar, use Nova admissao e selecione este paciente.
                </p>
              </div>
            ))}
          </div>
          {visibleInactivePatients.length === 0 ? (
            <div className="rounded-md border border-stone-200 bg-white p-6 text-sm text-stone-600 shadow-sm shadow-stone-200/50">
              Nenhum paciente inativo encontrado.
            </div>
          ) : null}
        </section>
      ) : null}

      {showDischargedAdmissions ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Historico de altas ({visibleDischargedAdmissions.length})</h2>
          <div className="overflow-x-auto rounded-md border border-stone-200 bg-white shadow-sm shadow-stone-200/50">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-stone-500">
                <tr>
                  <th className="px-4 py-3">Codigo</th>
                  <th>Leito</th>
                  <th>Admissao</th>
                  <th>Alta</th>
                  <th>Transplante</th>
                  <th>Status paciente</th>
                </tr>
              </thead>
              <tbody>
                {visibleDischargedAdmissions.map((admission) => (
                  <tr key={admission.id} className="border-b border-stone-100">
                    <td className="px-4 py-3">
                      <Link href={`/patients/${admission.id}`} className="font-medium hover:text-emerald-900">
                        {admission.patient.internalCode}
                      </Link>
                    </td>
                    <td className="py-3">{admission.bed.name}</td>
                    <td className="py-3">{formatDate(admission.admissionDate)}</td>
                    <td className="py-3">{admission.dischargeDate ? formatDate(admission.dischargeDate) : "-"}</td>
                    <td className="py-3">{transplantTypeLabels[admission.transplantType]}</td>
                    <td className="py-3 pr-4">{admission.patient.active ? "Ativo" : "Inativo"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visibleDischargedAdmissions.length === 0 ? (
              <div className="p-6 text-sm text-stone-600">Nenhuma alta encontrada para o filtro atual.</div>
            ) : null}
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}

function OperationMetric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="rounded-md border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/50">
      <div className="text-xs font-semibold uppercase text-stone-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-sm text-stone-600">{detail}</div>
    </div>
  );
}

function ActiveAdmissionCard({
  admission,
  freeBeds,
  referenceDate,
}: {
  admission: Awaited<ReturnType<typeof db.admission.findMany>>[number] & {
    bed: { id: string; name: string };
    patient: { internalCode: string };
    prescriptions: Array<{ dietType: string; kcalTarget: number }>;
    summaries: Array<{ alertLevel: Parameters<typeof StatusBadge>[0]["level"] }>;
  };
  freeBeds: Array<{ id: string; name: string }>;
  referenceDate: Date;
}) {
  const currentPrescription = admission.prescriptions[0];
  const latestSummary = admission.summaries[0];
  const displayTransplantDay = getDisplayTransplantDay(admission.transplantDay, admission.admissionDate, referenceDate) ?? "D+ nao informado";

  return (
    <article className="rounded-md border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/50">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={`/patients/${admission.id}`} className="text-lg font-semibold hover:text-emerald-900">
            {admission.patient.internalCode}
          </Link>
          <div className="mt-1 text-sm text-stone-600">
            {admission.bed.name} · {transplantTypeLabels[admission.transplantType]} · {displayTransplantDay} · desde {formatDate(admission.admissionDate)}
          </div>
          {currentPrescription ? (
            <div className="mt-1 text-sm text-stone-600">
              Dieta: {currentPrescription.dietType} · meta {currentPrescription.kcalTarget.toFixed(0)} kcal
            </div>
          ) : (
            <div className="mt-1 text-sm font-medium text-amber-700">Sem prescricao ativa</div>
          )}
        </div>
        {latestSummary ? <StatusBadge level={latestSummary.alertLevel} /> : <span className="rounded-md border border-stone-200 px-2 py-1 text-xs text-stone-500">Sem resumo</span>}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr]">
        {freeBeds.length > 0 ? (
          <form action={transferAdmissionBedAction} className="grid gap-2 rounded-md border border-stone-200 bg-stone-50/80 p-3 sm:grid-cols-[1fr_auto]">
            <input type="hidden" name="admissionId" value={admission.id} />
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase text-stone-500">Troca de leito</span>
              <select name="newBedId" className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm">
                {freeBeds.map((bed) => (
                  <option key={bed.id} value={bed.id}>
                    {bed.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="inline-flex items-center justify-center gap-2 self-end rounded-md border border-emerald-700 bg-white px-3 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-50">
              <ArrowRightLeft className="h-4 w-4" /> Trocar leito
            </button>
          </form>
        ) : (
          <div className="rounded-md border border-stone-200 bg-stone-50/80 p-3 text-sm text-stone-600">Sem leito livre para transferencia no momento.</div>
        )}

        <form action={dischargeAdmissionAction} className="grid gap-2 rounded-md border border-stone-200 bg-stone-50/80 p-3 sm:grid-cols-[1fr_auto]">
          <input type="hidden" name="admissionId" value={admission.id} />
          <label className="space-y-1">
            <span className="text-xs font-semibold uppercase text-stone-500">Alta operacional</span>
            <input name="dischargeDate" type="date" defaultValue={toDateInputValue(new Date())} className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm" required />
          </label>
          <button className="self-end rounded-md border border-rose-300 bg-white px-3 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-50">
            Dar alta
          </button>
        </form>
      </div>
    </article>
  );
}
