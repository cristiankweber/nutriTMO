import { AccessRestricted } from "@/components/AccessRestricted";
import { AppShell } from "@/components/AppShell";
import { createFoodItemAction, updateFoodItemAction } from "@/lib/actions";
import { canManageMenu } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { foodCategoryLabels } from "@/lib/labels";
import { FoodCategory } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

const categories = Object.keys(foodCategoryLabels) as FoodCategory[];

type FoodReferenceItem = {
  id: string;
  name: string;
  category: FoodCategory;
  standardPortionGrams: number;
  kcalPerPortion: number;
  carbsPerPortion: number | null;
  proteinPerPortion: number;
  fatPerPortion: number | null;
  sodiumMgPerPortion: number | null;
  active: boolean;
};

const inputClass = "min-h-10 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm";

const formatNumber = (value: number | null | undefined, suffix = "") => {
  if (value === null || value === undefined) return "-";
  return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}${suffix}`;
};

export default async function MenuPage({ searchParams }: { searchParams: Promise<{ salvo?: string }> }) {
  const user = await requireUser();
  const allowed = canManageMenu(user.role);
  if (!allowed) {
    return (
      <AppShell user={user}>
        <AccessRestricted description="A base alimentar de referencia fica disponivel apenas para admin e nutricao." />
      </AppShell>
    );
  }

  const params = await searchParams;
  const foods = await db.foodItem.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });

  return (
    <AppShell user={user}>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold">Base alimentar</h1>
        <p className="mt-1 text-sm text-stone-600">
          Banco de preparacoes de referencia usado no registro de ingesta; nao representa consumo do paciente.
        </p>
      </div>

      {params.salvo ? (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900">
          Base alimentar atualizada e trilha de auditoria registrada.
        </div>
      ) : null}

      {allowed ? (
        <details className="mb-5 rounded-md border border-stone-200 bg-white shadow-sm shadow-stone-200/50">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-stone-800 transition-colors hover:bg-stone-50 [&::-webkit-details-marker]:hidden">
            <span>
              Novo item de referencia
              <span className="mt-1 block text-xs font-normal text-stone-500">Use apenas para alimentar o cadastro base usado nos registros de ingesta.</span>
            </span>
            <span className="rounded-md border border-stone-300 px-2 py-1 text-xs text-stone-600">Expandir</span>
          </summary>
          <form action={createFoodItemAction} className="space-y-4 border-t border-stone-200 bg-stone-50/70 p-4">
            <FoodFields categories={categories} />
            <button className="w-full rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-900 sm:w-auto">
              Adicionar a base alimentar
            </button>
          </form>
        </details>
      ) : null}

      <section className="rounded-md border border-stone-200 bg-white shadow-sm shadow-stone-200/50">
        <div className="border-b border-stone-200 p-4">
          <h2 className="font-semibold">Itens de referencia</h2>
          <p className="mt-1 text-sm text-stone-600">Valores padrao por porcao. A edicao fica recolhida para separar cadastro de controle assistencial.</p>
        </div>
        {foods.length === 0 ? (
          <div className="p-6 text-sm text-stone-600">
            Nenhum item cadastrado na base alimentar. Adicione preparacoes demo antes de registrar ingesta.
          </div>
        ) : null}
        {foods.length > 0 ? (
          <>
            <div className="hidden grid-cols-[minmax(180px,2fr)_minmax(120px,1fr)_repeat(6,minmax(74px,1fr))_minmax(100px,auto)] gap-3 border-b border-stone-200 bg-stone-100/80 px-4 py-2 text-xs font-semibold uppercase text-stone-500 lg:grid">
              <span>Preparacao</span>
              <span>Categoria</span>
              <span>Porcao</span>
              <span>Kcal</span>
              <span>CHO</span>
              <span>PTN</span>
              <span>LIP</span>
              <span>Sodio</span>
              <span>Status</span>
            </div>
            <div className="divide-y divide-stone-100">
              {foods.map((food) => (
                <FoodReferenceRow key={food.id} food={food} allowed={allowed} categories={categories} />
              ))}
            </div>
          </>
        ) : null}
      </section>
    </AppShell>
  );
}

function FoodReferenceRow({
  food,
  allowed,
  categories,
}: {
  food: FoodReferenceItem;
  allowed: boolean;
  categories: FoodCategory[];
}) {
  const rowContent = (
    <>
      <ReferenceCell label="Preparacao" value={food.name} strong />
      <ReferenceCell label="Categoria" value={foodCategoryLabels[food.category]} />
      <ReferenceCell label="Porcao" value={formatNumber(food.standardPortionGrams, " g")} />
      <ReferenceCell label="Kcal" value={formatNumber(food.kcalPerPortion)} />
      <ReferenceCell label="CHO" value={formatNumber(food.carbsPerPortion, " g")} />
      <ReferenceCell label="PTN" value={formatNumber(food.proteinPerPortion, " g")} />
      <ReferenceCell label="LIP" value={formatNumber(food.fatPerPortion, " g")} />
      <ReferenceCell label="Sodio" value={formatNumber(food.sodiumMgPerPortion, " mg")} />
      <div className="flex items-center justify-between gap-2 lg:block">
        <span className={`rounded-md px-2 py-1 text-xs font-semibold ${food.active ? "bg-emerald-100 text-emerald-900" : "bg-stone-200 text-stone-700"}`}>
          {food.active ? "Ativo" : "Inativo"}
        </span>
        {allowed ? <span className="text-xs font-semibold text-emerald-900 lg:mt-1 lg:block">Editar</span> : null}
      </div>
    </>
  );

  if (!allowed) {
    return <div className="grid gap-3 px-4 py-3 text-sm lg:grid-cols-[minmax(180px,2fr)_minmax(120px,1fr)_repeat(6,minmax(74px,1fr))_minmax(100px,auto)]">{rowContent}</div>;
  }

  return (
    <details className="group">
      <summary className="grid cursor-pointer list-none gap-3 px-4 py-3 text-sm transition-colors hover:bg-emerald-50/60 lg:grid-cols-[minmax(180px,2fr)_minmax(120px,1fr)_repeat(6,minmax(74px,1fr))_minmax(100px,auto)] [&::-webkit-details-marker]:hidden">
        {rowContent}
      </summary>
      <form action={updateFoodItemAction} className="space-y-4 border-t border-stone-200 bg-stone-50/70 p-4">
        <input type="hidden" name="id" value={food.id} />
        <FoodFields categories={categories} food={food} />
        <button className="w-full rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-semibold transition-colors hover:bg-stone-100 sm:w-auto">
          Salvar alteracoes
        </button>
      </form>
    </details>
  );
}

function FoodFields({ categories, food }: { categories: FoodCategory[]; food?: FoodReferenceItem }) {
  return (
    <>
      <div>
        <div className="mb-2 text-xs font-semibold uppercase text-stone-500">Identificacao</div>
        <div className="grid gap-3 lg:grid-cols-[2fr_1fr_1fr]">
          <Field label="Preparacao">
            <input name="name" defaultValue={food?.name ?? ""} placeholder="Ex.: sopa, arroz, suplemento" className={inputClass} required />
          </Field>
          <Field label="Categoria">
            <select name="category" defaultValue={food?.category ?? categories[0]} className={inputClass}>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {foodCategoryLabels[category]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Porcao padrao">
            <input name="standardPortionGrams" type="number" step="0.1" defaultValue={food?.standardPortionGrams ?? ""} placeholder="g" className={inputClass} required />
          </Field>
        </div>
      </div>
      <div>
        <div className="mb-2 text-xs font-semibold uppercase text-stone-500">Nutrientes por porcao</div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Field label="Kcal">
            <input name="kcalPerPortion" type="number" step="0.1" defaultValue={food?.kcalPerPortion ?? ""} placeholder="kcal" className={inputClass} required />
          </Field>
          <Field label="CHO">
            <input name="carbsPerPortion" type="number" step="0.1" defaultValue={food?.carbsPerPortion ?? ""} placeholder="g" className={inputClass} />
          </Field>
          <Field label="PTN">
            <input name="proteinPerPortion" type="number" step="0.1" defaultValue={food?.proteinPerPortion ?? ""} placeholder="g" className={inputClass} required />
          </Field>
          <Field label="LIP">
            <input name="fatPerPortion" type="number" step="0.1" defaultValue={food?.fatPerPortion ?? ""} placeholder="g" className={inputClass} />
          </Field>
          <Field label="Sodio">
            <input name="sodiumMgPerPortion" type="number" step="1" defaultValue={food?.sodiumMgPerPortion ?? ""} placeholder="mg" className={inputClass} />
          </Field>
        </div>
      </div>
      {food ? (
        <label className="inline-flex min-h-10 items-center gap-2 rounded-md border border-stone-200 bg-white px-3 py-2 text-sm">
          <input name="active" type="checkbox" defaultChecked={food.active} /> Ativo
        </label>
      ) : null}
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

function ReferenceCell({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-semibold uppercase text-stone-400 lg:hidden">{label}</div>
      <div className={`truncate ${strong ? "font-semibold text-stone-950" : "text-stone-700"}`}>{value}</div>
    </div>
  );
}
