import { AccessRestricted } from "@/components/AccessRestricted";
import { AppShell } from "@/components/AppShell";
import { MealPhotos } from "@/components/MealPhotos";
import { reviewMealAction } from "@/lib/actions";
import { canReviewMeals } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { confidenceLabels, consumedPercentLabels, imageQualityLabels, mealTypeLabels } from "@/lib/labels";
import { getReviewQueueWhereClause, getReviewReasons, reviewReasonLabels } from "@/lib/review/rules";
import { ConsumedPercent, Confidence, ImageQuality } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

const percents = Object.keys(consumedPercentLabels) as ConsumedPercent[];
const imageQualities = Object.keys(imageQualityLabels) as ImageQuality[];
const confidences = Object.keys(confidenceLabels) as Confidence[];

export default async function ReviewPage({ searchParams }: { searchParams: Promise<{ salvo?: string }> }) {
  const user = await requireUser();
  if (!canReviewMeals(user.role)) {
    return (
      <AppShell user={user}>
        <AccessRestricted description="Revisao e cancelamento de registros de ingesta ficam disponiveis apenas para admin e nutricao." />
      </AppShell>
    );
  }
  const params = await searchParams;

  const meals = await db.meal.findMany({
    where: getReviewQueueWhereClause(),
    include: {
      admission: { include: { bed: true, patient: true } },
      items: { include: { foodItem: true } },
      createdBy: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  return (
    <AppShell user={user}>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold">Revisao humana</h1>
        <p className="mt-1 text-sm text-stone-600">Registros de ingesta com baixa confianca, foto inadequada ou preenchimento parcial.</p>
      </div>

      {params.salvo ? (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
          Revisao salva, itens recalculados e trilha de auditoria registrada.
        </div>
      ) : null}

      <div className="space-y-4">
        {meals.map((meal) => (
          <form key={meal.id} action={reviewMealAction} className="rounded-md border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/50">
            <input type="hidden" name="mealId" value={meal.id} />
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-semibold">
                  {meal.admission.bed.name} - {meal.admission.patient.internalCode} · {mealTypeLabels[meal.mealType]}
                </div>
                <div className="text-sm text-stone-600">Criado por {meal.createdBy.name}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {getReviewReasons(meal).map((reason) => (
                    <span key={reason} className="rounded-md border border-orange-200 bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-900">
                      {reviewReasonLabels[reason]}
                    </span>
                  ))}
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <select name="imageQuality" defaultValue={meal.imageQuality} className="rounded-md border border-stone-300 px-3 py-2 text-sm">
                  {imageQualities.map((quality) => (
                    <option key={quality} value={quality}>
                      {imageQualityLabels[quality]}
                    </option>
                  ))}
                </select>
                <select name="confidence" defaultValue={meal.confidence} className="rounded-md border border-stone-300 px-3 py-2 text-sm">
                  {confidences.map((confidence) => (
                    <option key={confidence} value={confidence}>
                      {confidenceLabels[confidence]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mb-4">
              {meal.preMealImageUrl || meal.postMealImageUrl ? (
                <MealPhotos preMealImageUrl={meal.preMealImageUrl} postMealImageUrl={meal.postMealImageUrl} />
              ) : (
                <p className="text-xs text-stone-500">Sem fotos anexadas a esta refeicao.</p>
              )}
            </div>
            <div className="space-y-2">
              {meal.items.map((item) => (
                <div key={item.id} className="grid gap-2 rounded-md border border-stone-200 bg-stone-50/80 p-3 md:grid-cols-[2fr_1fr_2fr]">
                  <div>
                    <div className="font-medium">{item.foodItem.name}</div>
                    <div className="text-sm text-stone-600">
                      {item.servedKcal.toFixed(0)} kcal servidas · {item.servedProtein.toFixed(1)} g proteina servida
                    </div>
                  </div>
                  <select name={`percent-${item.id}`} defaultValue={item.consumedPercent} className="rounded-md border border-stone-300 px-3 py-2">
                    {percents.map((percent) => (
                      <option key={percent} value={percent}>
                        {consumedPercentLabels[percent]}
                      </option>
                    ))}
                  </select>
                  <input name={`notes-${item.id}`} defaultValue={item.notes ?? ""} placeholder="Observacao do item" className="rounded-md border border-stone-300 px-3 py-2" />
                </div>
              ))}
            </div>
            <textarea name="mealNotes" defaultValue={meal.notes ?? ""} className="mt-3 w-full rounded-md border border-stone-300 px-3 py-2 text-sm" placeholder="Observacao da revisao" />
            <button className="mt-3 w-full rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-900 sm:w-auto">Salvar revisao</button>
          </form>
        ))}
        {meals.length === 0 ? <div className="rounded-md border border-stone-200 bg-white p-6 text-sm text-stone-600 shadow-sm shadow-stone-200/50">Nenhum registro de ingesta pendente de revisao.</div> : null}
      </div>
    </AppShell>
  );
}
