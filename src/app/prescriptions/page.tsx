import { AppShell } from "@/components/AppShell";
import { createPrescriptionAction, updatePrescriptionAction } from "@/lib/actions";
import { canManagePrescriptions } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { formatDate, toDateInputValue } from "@/lib/dates";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

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
        <p className="mt-1 text-sm text-stone-600">Metas diarias, consistencia, restricoes e plano de suplementos.</p>
      </div>

      {params.salvo ? (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
          Prescricao atualizada e trilha de auditoria registrada.
        </div>
      ) : null}

      {allowed ? (
        <form action={createPrescriptionAction} className="mb-5 grid gap-3 rounded-md border border-stone-200 bg-white p-4 md:grid-cols-4">
          <select name="admissionId" className="rounded-md border border-stone-300 px-3 py-2 md:col-span-2">
            {admissions.map((admission) => (
              <option key={admission.id} value={admission.id}>
                {admission.bed.name} - {admission.patient.internalCode}
              </option>
            ))}
          </select>
          <input name="date" type="date" defaultValue={toDateInputValue(new Date())} className="rounded-md border border-stone-300 px-3 py-2" required />
          <label className="flex items-center gap-2 text-sm">
            <input name="reviewed" type="checkbox" /> Revisada
          </label>
          <input name="dietType" placeholder="Tipo de dieta" className="rounded-md border border-stone-300 px-3 py-2" required />
          <input name="consistency" placeholder="Consistencia" className="rounded-md border border-stone-300 px-3 py-2" required />
          <input name="kcalTarget" type="number" step="1" placeholder="Meta kcal" className="rounded-md border border-stone-300 px-3 py-2" required />
          <input name="proteinTarget" type="number" step="0.1" placeholder="Meta proteina g" className="rounded-md border border-stone-300 px-3 py-2" required />
          <input name="restrictions" placeholder="Restricoes" className="rounded-md border border-stone-300 px-3 py-2 md:col-span-2" />
          <input name="fluidRestriction" placeholder="Restricao hidrica" className="rounded-md border border-stone-300 px-3 py-2" />
          <input name="supplementsPlan" placeholder="Plano de suplementos" className="rounded-md border border-stone-300 px-3 py-2" />
          <button className="rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900 md:col-span-4">Criar prescricao</button>
        </form>
      ) : null}

      <div className="space-y-3">
        {prescriptions.map((prescription) => (
          <div key={prescription.id} className="rounded-md border border-stone-200 bg-white p-4">
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
              <div className="rounded-md bg-stone-50 p-3">Restricoes: {prescription.restrictions ?? "Nao registradas"}</div>
              <div className="rounded-md bg-stone-50 p-3">Suplementos: {prescription.supplementsPlan ?? "Nao registrado"}</div>
              <div className="rounded-md bg-stone-50 p-3">Criado por: {prescription.createdBy.name}</div>
            </div>
            {allowed ? (
              <details className="mt-3 rounded-md border border-stone-200 bg-stone-50 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-stone-700">Editar prescricao</summary>
                <form action={updatePrescriptionAction} className="mt-3 grid gap-3 md:grid-cols-4">
                  <input type="hidden" name="id" value={prescription.id} />
                  <input name="date" type="date" defaultValue={toDateInputValue(prescription.date)} className="rounded-md border border-stone-300 px-3 py-2" required />
                  <input name="dietType" defaultValue={prescription.dietType} placeholder="Tipo de dieta" className="rounded-md border border-stone-300 px-3 py-2" required />
                  <input name="consistency" defaultValue={prescription.consistency} placeholder="Consistencia" className="rounded-md border border-stone-300 px-3 py-2" required />
                  <label className="flex items-center gap-2 text-sm">
                    <input name="reviewed" type="checkbox" defaultChecked={Boolean(prescription.reviewedById)} /> Revisada
                  </label>
                  <input name="kcalTarget" type="number" step="1" defaultValue={prescription.kcalTarget} placeholder="Meta kcal" className="rounded-md border border-stone-300 px-3 py-2" required />
                  <input name="proteinTarget" type="number" step="0.1" defaultValue={prescription.proteinTarget} placeholder="Meta proteina g" className="rounded-md border border-stone-300 px-3 py-2" required />
                  <input name="restrictions" defaultValue={prescription.restrictions ?? ""} placeholder="Restricoes" className="rounded-md border border-stone-300 px-3 py-2 md:col-span-2" />
                  <input name="fluidRestriction" defaultValue={prescription.fluidRestriction ?? ""} placeholder="Restricao hidrica" className="rounded-md border border-stone-300 px-3 py-2" />
                  <input name="supplementsPlan" defaultValue={prescription.supplementsPlan ?? ""} placeholder="Plano de suplementos" className="rounded-md border border-stone-300 px-3 py-2" />
                  <button className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-stone-100 md:col-span-2">
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
