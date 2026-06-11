import { AppShell } from "@/components/AppShell";
import { createPrescriptionAction, updatePrescriptionAction } from "@/lib/actions";
import { canManagePrescriptions } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { formatDate, toDateInputValue } from "@/lib/dates";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type PrescriptionFieldsValue = {
  dietType: string;
  consistency: string;
  kcalTarget: number;
  proteinTarget: number;
  restrictions: string | null;
  fluidRestriction: string | null;
  supplementsPlan: string | null;
};

const inputClass = "min-h-10 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm";

export default async function PrescriptionsPage({ searchParams }: { searchParams: Promise<{ salvo?: string }> }) {
  const user = await requireUser();
  const allowed = canManagePrescriptions(user.role);
  const params = await searchParams;
  const [admissions, prescriptions] = await Promise.all([
    db.admission.findMany({ where: { active: true }, include: { bed: true, patient: true }, orderBy: { bed: { name: "asc" } } }),
    db.nutritionPrescription.findMany({
      include: { admission: { include: { bed: true, patient: true } }, createdBy: true, reviewedBy: true },
      orderBy: { date: "desc" },
      take: 40,
    }),
  ]);

  return (
    <AppShell user={user}>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold">Prescricao nutricional</h1>
        <p className="mt-1 text-sm text-stone-600">
          Plano e metas do paciente. Esta tela nao registra consumo; o consumo real fica em Registro de ingesta.
        </p>
      </div>

      {params.salvo ? (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
          Prescricao atualizada e trilha de auditoria registrada.
        </div>
      ) : null}

      {allowed && admissions.length > 0 ? (
        <form action={createPrescriptionAction} className="mb-5 space-y-4 rounded-md border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/50">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase text-stone-500">Paciente e revisao</div>
            <div className="grid gap-3 lg:grid-cols-[2fr_1fr_auto]">
              <Field label="Paciente/leito">
                <select name="admissionId" className={inputClass}>
                  {admissions.map((admission) => (
                    <option key={admission.id} value={admission.id}>
                      {admission.bed.name} - {admission.patient.internalCode}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Data">
                <input name="date" type="date" defaultValue={toDateInputValue(new Date())} className={inputClass} required />
              </Field>
              <label className="inline-flex min-h-10 items-center gap-2 self-end rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm">
                <input name="reviewed" type="checkbox" /> Revisada
              </label>
            </div>
          </div>
          <PrescriptionFields />
          <button className="w-full rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-900 sm:w-auto">Criar prescricao</button>
        </form>
      ) : null}
      {allowed && admissions.length === 0 ? (
        <div className="mb-5 rounded-md border border-stone-200 bg-white p-6 text-sm text-stone-600 shadow-sm shadow-stone-200/50">
          Nenhuma admissao ativa disponivel para nova prescricao.
        </div>
      ) : null}

      <div className="space-y-3">
        {prescriptions.length === 0 ? (
          <div className="rounded-md border border-stone-200 bg-white p-6 text-sm text-stone-600 shadow-sm shadow-stone-200/50">
            Nenhuma prescricao cadastrada no demo atual.
          </div>
        ) : null}
        {prescriptions.map((prescription) => (
          <div key={prescription.id} className="rounded-md border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/50">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-semibold">
                  {prescription.admission.bed.name} - {prescription.admission.patient.internalCode}
                </div>
                <div className="text-sm text-stone-600">
                  {formatDate(prescription.date)} · {prescription.dietType} · {prescription.consistency}
                </div>
              </div>
              <div className="text-right text-sm">
                <div className="font-semibold">{prescription.kcalTarget.toFixed(0)} kcal</div>
                <div className="text-stone-600">{prescription.proteinTarget.toFixed(1)} g proteina</div>
              </div>
            </div>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
              <div className="rounded-md border border-stone-200 bg-stone-50/80 p-3">Restricoes: {prescription.restrictions ?? "Nao registradas"}</div>
              <div className="rounded-md border border-stone-200 bg-stone-50/80 p-3">Suplementos: {prescription.supplementsPlan ?? "Nao registrado"}</div>
              <div className="rounded-md border border-stone-200 bg-stone-50/80 p-3">Criado por: {prescription.createdBy.name}</div>
            </div>
            {allowed ? (
              <details className="mt-3 rounded-md border border-stone-200 bg-stone-50/80 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-stone-700">Editar prescricao</summary>
                <form action={updatePrescriptionAction} className="mt-3 space-y-4">
                  <input type="hidden" name="id" value={prescription.id} />
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <Field label="Data">
                      <input name="date" type="date" defaultValue={toDateInputValue(prescription.date)} className={inputClass} required />
                    </Field>
                    <label className="inline-flex min-h-10 items-center gap-2 self-end rounded-md border border-stone-200 bg-white px-3 py-2 text-sm">
                      <input name="reviewed" type="checkbox" defaultChecked={Boolean(prescription.reviewedById)} /> Revisada
                    </label>
                  </div>
                  <PrescriptionFields prescription={prescription} />
                  <button className="w-full rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-semibold transition-colors hover:bg-stone-100 sm:w-auto">
                    Salvar alteracoes
                  </button>
                </form>
              </details>
            ) : null}
          </div>
        ))}
      </div>
    </AppShell>
  );
}

function PrescriptionFields({ prescription }: { prescription?: PrescriptionFieldsValue }) {
  return (
    <>
      <div>
        <div className="mb-2 text-xs font-semibold uppercase text-stone-500">Plano</div>
        <div className="grid gap-3 lg:grid-cols-2">
          <Field label="Tipo de dieta">
            <input name="dietType" defaultValue={prescription?.dietType ?? ""} placeholder="Tipo de dieta" className={inputClass} required />
          </Field>
          <Field label="Consistencia">
            <input name="consistency" defaultValue={prescription?.consistency ?? ""} placeholder="Consistencia" className={inputClass} required />
          </Field>
        </div>
      </div>
      <div>
        <div className="mb-2 text-xs font-semibold uppercase text-stone-500">Metas e observacoes</div>
        <div className="grid gap-3 lg:grid-cols-4">
          <Field label="Meta kcal">
            <input name="kcalTarget" type="number" step="1" defaultValue={prescription?.kcalTarget ?? ""} placeholder="kcal" className={inputClass} required />
          </Field>
          <Field label="Meta proteina">
            <input name="proteinTarget" type="number" step="0.1" defaultValue={prescription?.proteinTarget ?? ""} placeholder="g" className={inputClass} required />
          </Field>
          <Field label="Restricoes" className="lg:col-span-2">
            <input name="restrictions" defaultValue={prescription?.restrictions ?? ""} placeholder="Restricoes" className={inputClass} />
          </Field>
          <Field label="Restricao hidrica" className="lg:col-span-2">
            <input name="fluidRestriction" defaultValue={prescription?.fluidRestriction ?? ""} placeholder="Restricao hidrica" className={inputClass} />
          </Field>
          <Field label="Plano de suplementos" className="lg:col-span-2">
            <input name="supplementsPlan" defaultValue={prescription?.supplementsPlan ?? ""} placeholder="Plano de suplementos" className={inputClass} />
          </Field>
        </div>
      </div>
    </>
  );
}

function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`space-y-1 text-xs font-semibold uppercase text-stone-500 ${className}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}
