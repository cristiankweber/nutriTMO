import Link from "next/link";
import { UserPlus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { createPatientAdmissionAction, dischargeAdmissionAction } from "@/lib/actions";
import { canManagePatients } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { formatDate, toDateInputValue } from "@/lib/dates";
import { db } from "@/lib/db";
import { transplantTypeLabels } from "@/lib/labels";
import { TransplantType } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

const transplantTypes = Object.keys(transplantTypeLabels) as TransplantType[];

export default async function PatientsPage({ searchParams }: { searchParams: Promise<{ secao?: string }> }) {
  const user = await requireUser();
  const allowed = canManagePatients(user.role);
  const params = await searchParams;

  const [beds, admissions] = await Promise.all([
    db.bed.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.admission.findMany({
      include: {
        bed: true,
        patient: true,
        prescriptions: { orderBy: { date: "desc" }, take: 1 },
        summaries: { orderBy: { date: "desc" }, take: 1 },
      },
      orderBy: [{ active: "desc" }, { bed: { name: "asc" } }],
    }),
  ]);

  const activeAdmissions = admissions.filter((a) => a.active);
  const dischargedAdmissions = admissions.filter((a) => !a.active);
  const occupiedBedIds = new Set(activeAdmissions.map((a) => a.bedId));
  const freeBeds = beds.filter((bed) => !occupiedBedIds.has(bed.id));

  return (
    <AppShell user={user}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Pacientes e admissoes</h1>
          <p className="mt-1 text-sm text-stone-600">Leitos ativos, dados pseudonimizados e gestao de altas.</p>
        </div>
        {allowed ? (
          <a href="#nova-admissao" className="inline-flex items-center gap-2 rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900">
            <UserPlus className="h-4 w-4" /> Nova admissao
          </a>
        ) : null}
      </div>

      {params.secao === "alta" ? (
        <div className="mb-4 rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-900">
          Alta registrada com sucesso.
        </div>
      ) : null}

      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">Admissoes ativas ({activeAdmissions.length})</h2>
        {activeAdmissions.length === 0 ? (
          <div className="rounded-md border border-stone-200 bg-white p-6 text-sm text-stone-600">Nenhuma admissao ativa no momento.</div>
        ) : (
          <div className="space-y-3">
            {activeAdmissions.map((admission) => (
              <div key={admission.id} className="rounded-md border border-stone-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/patients/${admission.id}`} className="text-lg font-semibold hover:text-emerald-900">
                      {admission.patient.internalCode}
                    </Link>
                    <div className="mt-1 text-sm text-stone-600">
                      {admission.bed.name} · {transplantTypeLabels[admission.transplantType]} · D+ {admission.transplantDay ?? "nao informado"} · desde {formatDate(admission.admissionDate)}
                    </div>
                    {admission.prescriptions[0] ? (
                      <div className="mt-1 text-sm text-stone-600">
                        Dieta: {admission.prescriptions[0].dietType} · meta {admission.prescriptions[0].kcalTarget.toFixed(0)} kcal
                      </div>
                    ) : (
                      <div className="mt-1 text-sm text-amber-700">Sem prescricao ativa</div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {admission.summaries[0] ? <StatusBadge level={admission.summaries[0].alertLevel} /> : null}
                    {allowed ? (
                      <form action={dischargeAdmissionAction} className="flex items-center gap-2">
                        <input type="hidden" name="admissionId" value={admission.id} />
                        <input name="dischargeDate" type="date" defaultValue={toDateInputValue(new Date())} className="rounded-md border border-stone-300 px-3 py-1.5 text-sm" required />
                        <button className="rounded-md border border-rose-300 px-3 py-1.5 text-sm font-semibold text-rose-800 hover:bg-rose-50">
                          Dar alta
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {allowed ? (
        <section id="nova-admissao" className="mb-6 scroll-mt-8 rounded-md border border-stone-200 bg-white p-4">
          <h2 className="mb-3 text-lg font-semibold">Nova admissao</h2>
          {freeBeds.length === 0 ? (
            <p className="text-sm text-stone-600">Todos os leitos estao ocupados. Registre uma alta antes de admitir novo paciente.</p>
          ) : (
            <form action={createPatientAdmissionAction} className="grid gap-3 md:grid-cols-3">
              <label className="space-y-1">
                <span className="text-sm font-medium">Codigo interno do paciente</span>
                <input name="internalCode" placeholder="Ex: TMO-2026-001" className="w-full rounded-md border border-stone-300 px-3 py-2" required />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium">Leito</span>
                <select name="bedId" className="w-full rounded-md border border-stone-300 px-3 py-2">
                  {freeBeds.map((bed) => (
                    <option key={bed.id} value={bed.id}>{bed.name}</option>
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
                    <option key={type} value={type}>{transplantTypeLabels[type]}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium">D+ do transplante</span>
                <input name="transplantDay" placeholder="Ex: D+0 ou D-5" className="w-full rounded-md border border-stone-300 px-3 py-2" />
              </label>
              <label className="space-y-1">
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
      ) : null}

      {dischargedAdmissions.length > 0 ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Historico de altas ({dischargedAdmissions.length})</h2>
          <div className="overflow-x-auto rounded-md border border-stone-200 bg-white">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-stone-500">
                <tr>
                  <th className="px-4 py-3">Codigo</th>
                  <th>Leito</th>
                  <th>Admissao</th>
                  <th>Alta</th>
                  <th>Transplante</th>
                </tr>
              </thead>
              <tbody>
                {dischargedAdmissions.map((admission) => (
                  <tr key={admission.id} className="border-b border-stone-100">
                    <td className="px-4 py-3">
                      <Link href={`/patients/${admission.id}`} className="font-medium hover:text-emerald-900">
                        {admission.patient.internalCode}
                      </Link>
                    </td>
                    <td className="py-3">{admission.bed.name}</td>
                    <td className="py-3">{formatDate(admission.admissionDate)}</td>
                    <td className="py-3">{admission.dischargeDate ? formatDate(admission.dischargeDate) : "-"}</td>
                    <td className="py-3 pr-4">{transplantTypeLabels[admission.transplantType]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}
