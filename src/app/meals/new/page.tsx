import { AppShell } from "@/components/AppShell";
import { MealRegistrationForm } from "@/components/MealRegistrationForm";
import { createMealAction } from "@/lib/actions";
import { canRegisterMeals } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function NewMealPage() {
  const user = await requireUser();
  if (!canRegisterMeals(user.role)) {
    throw new Error("Perfil sem permissao para registrar ingesta.");
  }

  const [admissions, foods] = await Promise.all([
    db.admission.findMany({ where: { active: true }, include: { bed: true, patient: true }, orderBy: { bed: { name: "asc" } } }),
    db.foodItem.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <AppShell user={user}>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold">Registro de ingesta</h1>
        <p className="mt-1 text-sm text-stone-600">
          Controle do que foi servido e consumido pelo paciente, usando a base alimentar como referencia.
        </p>
      </div>
      {admissions.length === 0 || foods.length === 0 ? (
        <div className="rounded-md border border-stone-200 bg-white p-6 text-sm text-stone-600">
          {admissions.length === 0
            ? "Nenhuma admissao ativa disponivel para registro de ingesta."
            : "Nenhum item ativo na base alimentar. Cadastre preparacoes antes de registrar ingesta."}
        </div>
      ) : (
        <MealRegistrationForm
          action={createMealAction}
          admissions={admissions.map((admission) => ({
            id: admission.id,
            bed: admission.bed.name,
            patientCode: admission.patient.internalCode,
            transplantDay: admission.transplantDay,
          }))}
          foods={foods.map((food) => ({
            id: food.id,
            name: food.name,
            kcalPerPortion: food.kcalPerPortion,
            proteinPerPortion: food.proteinPerPortion,
            carbsPerPortion: food.carbsPerPortion,
            fatPerPortion: food.fatPerPortion,
          }))}
        />
      )}
    </AppShell>
  );
}
