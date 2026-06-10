import { AppShell } from "@/components/AppShell";
import { createFoodItemAction, updateFoodItemAction } from "@/lib/actions";
import { canManageMenu } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { foodCategoryLabels } from "@/lib/labels";
import { FoodCategory } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

const categories = Object.keys(foodCategoryLabels) as FoodCategory[];

export default async function MenuPage() {
  const user = await requireUser();
  const allowed = canManageMenu(user.role);
  const foods = await db.foodItem.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });

  return (
    <AppShell user={user}>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold">Cardapio e preparacoes</h1>
        <p className="mt-1 text-sm text-stone-600">Cadastro de porcoes padrao, kcal, CHO, proteina, lipidio e sodio por porcao.</p>
      </div>

      {allowed ? (
        <form action={createFoodItemAction} className="mb-5 grid gap-3 rounded-md border border-stone-200 bg-white p-4 md:grid-cols-9">
          <input name="name" placeholder="Preparacao" className="rounded-md border border-stone-300 px-3 py-2 md:col-span-2" required />
          <select name="category" className="rounded-md border border-stone-300 px-3 py-2">
            {categories.map((category) => (
              <option key={category} value={category}>
                {foodCategoryLabels[category]}
              </option>
            ))}
          </select>
          <input name="standardPortionGrams" type="number" step="0.1" placeholder="g/porcao" className="rounded-md border border-stone-300 px-3 py-2" required />
          <input name="kcalPerPortion" type="number" step="0.1" placeholder="kcal" className="rounded-md border border-stone-300 px-3 py-2" required />
          <input name="carbsPerPortion" type="number" step="0.1" placeholder="CHO g" className="rounded-md border border-stone-300 px-3 py-2" />
          <input name="proteinPerPortion" type="number" step="0.1" placeholder="proteina g" className="rounded-md border border-stone-300 px-3 py-2" required />
          <input name="fatPerPortion" type="number" step="0.1" placeholder="LIP g" className="rounded-md border border-stone-300 px-3 py-2" />
          <input name="sodiumMgPerPortion" type="number" step="1" placeholder="sodio mg" className="rounded-md border border-stone-300 px-3 py-2" />
          <button className="rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900 md:col-span-9">Adicionar preparacao</button>
        </form>
      ) : null}

      <div className="space-y-3">
        {foods.map((food) => (
          <form key={food.id} action={updateFoodItemAction} className="grid gap-3 rounded-md border border-stone-200 bg-white p-4 md:grid-cols-11">
            <input type="hidden" name="id" value={food.id} />
            <input name="name" defaultValue={food.name} className="rounded-md border border-stone-300 px-3 py-2 md:col-span-2" disabled={!allowed} />
            <select name="category" defaultValue={food.category} className="rounded-md border border-stone-300 px-3 py-2" disabled={!allowed}>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {foodCategoryLabels[category]}
                </option>
              ))}
            </select>
            <input name="standardPortionGrams" type="number" step="0.1" defaultValue={food.standardPortionGrams} className="rounded-md border border-stone-300 px-3 py-2" disabled={!allowed} />
            <input name="kcalPerPortion" type="number" step="0.1" defaultValue={food.kcalPerPortion} className="rounded-md border border-stone-300 px-3 py-2" disabled={!allowed} />
            <input name="carbsPerPortion" type="number" step="0.1" defaultValue={food.carbsPerPortion ?? ""} className="rounded-md border border-stone-300 px-3 py-2" disabled={!allowed} />
            <input name="proteinPerPortion" type="number" step="0.1" defaultValue={food.proteinPerPortion} className="rounded-md border border-stone-300 px-3 py-2" disabled={!allowed} />
            <input name="fatPerPortion" type="number" step="0.1" defaultValue={food.fatPerPortion ?? ""} className="rounded-md border border-stone-300 px-3 py-2" disabled={!allowed} />
            <input name="sodiumMgPerPortion" type="number" step="1" defaultValue={food.sodiumMgPerPortion ?? ""} placeholder="sodio mg" className="rounded-md border border-stone-300 px-3 py-2" disabled={!allowed} />
            <label className="flex items-center gap-2 text-sm">
              <input name="active" type="checkbox" defaultChecked={food.active} disabled={!allowed} /> Ativo
            </label>
            {allowed ? <button className="rounded-md border border-stone-300 px-3 py-2 text-sm font-semibold hover:bg-stone-50">Salvar</button> : null}
          </form>
        ))}
      </div>
    </AppShell>
  );
}
