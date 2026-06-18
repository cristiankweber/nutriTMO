"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Confidence, ImageQuality, MealType } from "@/generated/prisma/enums";
import { consumedPercentToValue, type ConsumedPercentKey } from "@/lib/clinical/calculations";
import { toDateInputValue } from "@/lib/dates";
import { confidenceLabels, consumedPercentLabels, imageQualityLabels, mealTypeLabels } from "@/lib/labels";

type AdmissionOption = {
  id: string;
  bed: string;
  patientCode: string;
  transplantDay: string | null;
};

type FoodOption = {
  id: string;
  name: string;
  kcalPerPortion: number;
  proteinPerPortion: number;
  carbsPerPortion: number | null;
  fatPerPortion: number | null;
};

type Row = {
  localId: number;
  foodItemId: string;
  servedPortionMultiplier: string;
  consumedPercent: ConsumedPercentKey;
  itemNotes: string;
};

type MealPreset = {
  label: string;
  rows: Array<Pick<Row, "foodItemId" | "servedPortionMultiplier" | "consumedPercent">>;
};

const mealTypes: MealType[] = ["CAFE_MANHA", "LANCHE_MANHA", "ALMOCO", "LANCHE_TARDE", "JANTAR", "CEIA", "SUPLEMENTO", "OUTRO"];
const imageQualities: ImageQuality[] = ["ADEQUADA", "INADEQUADA", "NAO_AVALIADA"];
const confidences: Confidence[] = ["ALTA", "MEDIA", "BAIXA", "NAO_APLICAVEL"];
const percents: ConsumedPercentKey[] = ["ZERO", "TWENTY_FIVE", "FIFTY", "SEVENTY_FIVE", "ONE_HUNDRED"];

const multipliers = ["0.5", "1", "1.5", "2"];

const presetConfigs = [
  {
    label: "Almoco/jantar",
    consumedPercent: "SEVENTY_FIVE" as ConsumedPercentKey,
    items: [
      { terms: ["arroz"], servedPortionMultiplier: "1" },
      { terms: ["feijao"], servedPortionMultiplier: "1" },
      { terms: ["frango", "carne"], servedPortionMultiplier: "1" },
      { terms: ["legumes"], servedPortionMultiplier: "1" },
    ],
  },
  {
    label: "Suplemento",
    consumedPercent: "ONE_HUNDRED" as ConsumedPercentKey,
    items: [{ terms: ["suplemento"], servedPortionMultiplier: "1" }],
  },
  {
    label: "Lanche",
    consumedPercent: "SEVENTY_FIVE" as ConsumedPercentKey,
    items: [
      { terms: ["fruta"], servedPortionMultiplier: "1" },
      { terms: ["bebida"], servedPortionMultiplier: "1" },
    ],
  },
];

const normalizeFoodName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export function MealRegistrationForm({
  admissions,
  foods,
  action,
}: {
  admissions: AdmissionOption[];
  foods: FoodOption[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [rows, setRows] = useState<Row[]>([
    { localId: 1, foodItemId: foods[0]?.id ?? "", servedPortionMultiplier: "1", consumedPercent: "FIFTY", itemNotes: "" },
  ]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        const food = foods.find((item) => item.id === row.foodItemId);
        const multiplier = Number(row.servedPortionMultiplier);
        const percent = consumedPercentToValue[row.consumedPercent];
        if (!food || !Number.isFinite(multiplier)) return acc;
        const servedKcal = food.kcalPerPortion * multiplier;
        const servedProtein = food.proteinPerPortion * multiplier;
        const servedCarbs = (food.carbsPerPortion ?? 0) * multiplier;
        const servedFat = (food.fatPerPortion ?? 0) * multiplier;
        return {
          servedKcal: acc.servedKcal + servedKcal,
          servedProtein: acc.servedProtein + servedProtein,
          servedCarbs: acc.servedCarbs + servedCarbs,
          servedFat: acc.servedFat + servedFat,
          consumedKcal: acc.consumedKcal + (servedKcal * percent) / 100,
          consumedProtein: acc.consumedProtein + (servedProtein * percent) / 100,
          consumedCarbs: acc.consumedCarbs + (servedCarbs * percent) / 100,
          consumedFat: acc.consumedFat + (servedFat * percent) / 100,
        };
      },
      {
        servedKcal: 0,
        servedProtein: 0,
        servedCarbs: 0,
        servedFat: 0,
        consumedKcal: 0,
        consumedProtein: 0,
        consumedCarbs: 0,
        consumedFat: 0,
      },
    );
  }, [foods, rows]);

  const mealPresets = useMemo<MealPreset[]>(() => {
    return presetConfigs
      .map((preset) => {
        const usedFoodIds = new Set<string>();
        const presetRows = preset.items.flatMap((item) => {
          const food = foods.find((option) => {
            if (usedFoodIds.has(option.id)) return false;
            const normalizedName = normalizeFoodName(option.name);
            return item.terms.some((term) => normalizedName.includes(term));
          });
          if (!food) return [];
          usedFoodIds.add(food.id);
          return [
            {
              foodItemId: food.id,
              servedPortionMultiplier: item.servedPortionMultiplier,
              consumedPercent: preset.consumedPercent,
            },
          ];
        });
        return { label: preset.label, rows: presetRows };
      })
      .filter((preset) => preset.rows.length > 0);
  }, [foods]);

  const updateRow = (localId: number, patch: Partial<Row>) => {
    setRows((current) => current.map((row) => (row.localId === localId ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    setRows((current) => [
      ...current,
      { localId: Date.now(), foodItemId: foods[0]?.id ?? "", servedPortionMultiplier: "1", consumedPercent: "FIFTY", itemNotes: "" },
    ]);
  };

  const applyMealPreset = (preset: MealPreset) => {
    setRows(
      preset.rows.map((row, index) => ({
        localId: Date.now() + index,
        itemNotes: "",
        ...row,
      })),
    );
  };

  const applyConsumedPercentToAllRows = (consumedPercent: ConsumedPercentKey) => {
    setRows((current) => current.map((row) => ({ ...row, consumedPercent })));
  };

  return (
    <form action={action} className="space-y-5 rounded-md border border-stone-200 bg-white p-4 pb-36 shadow-sm shadow-stone-200/50 lg:pb-4">
      <MobileStickyTotals totals={totals} itemCount={rows.length} />

      <div className="grid gap-4 md:grid-cols-4">
        <label className="space-y-1 md:col-span-2">
          <span className="text-sm font-medium">Paciente/leito</span>
          <select name="admissionId" className="w-full rounded-md border border-stone-300 px-3 py-2" required>
            {admissions.map((admission) => (
              <option key={admission.id} value={admission.id}>
                {admission.bed} - {admission.patientCode} {admission.transplantDay ? `(${admission.transplantDay})` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium">Data</span>
          <input name="date" type="date" className="w-full rounded-md border border-stone-300 px-3 py-2" defaultValue={toDateInputValue(new Date())} required />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium">Refeicao</span>
          <select name="mealType" className="w-full rounded-md border border-stone-300 px-3 py-2">
            {mealTypes.map((mealType) => (
              <option key={mealType} value={mealType}>
                {mealTypeLabels[mealType]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <label className="space-y-1">
          <span className="text-sm font-medium">Qualidade da foto</span>
          <select name="imageQuality" className="w-full rounded-md border border-stone-300 px-3 py-2">
            {imageQualities.map((quality) => (
              <option key={quality} value={quality}>
                {imageQualityLabels[quality]}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-sm font-medium">Confianca do registro</span>
          <select name="confidence" className="w-full rounded-md border border-stone-300 px-3 py-2" defaultValue="ALTA">
            {confidences.map((confidence) => (
              <option key={confidence} value={confidence}>
                {confidenceLabels[confidence]}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 md:col-span-2">
          <span className="text-sm font-medium">Observacoes</span>
          <input name="notes" className="w-full rounded-md border border-stone-300 px-3 py-2" />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 rounded-md border border-stone-200 bg-stone-50/70 p-3">
          <span className="block text-sm font-medium">Foto pre-refeicao</span>
          <input name="preMealImage" type="file" accept="image/*" capture="environment" className="w-full text-sm" />
          <span className="block text-xs leading-5 text-stone-600">
            Evite rosto, pulseira, etiqueta ou prontuario visivel. Use apenas imagem demo/local nesta fase.
          </span>
          <span className="flex items-center gap-2 text-xs text-stone-600">
            <input name="preMealImageIdentifier" type="checkbox" className="h-4 w-4" /> Possivel identificador visivel
          </span>
        </label>
        <label className="space-y-2 rounded-md border border-stone-200 bg-stone-50/70 p-3">
          <span className="block text-sm font-medium">Foto pos-refeicao</span>
          <input name="postMealImage" type="file" accept="image/*" capture="environment" className="w-full text-sm" />
          <span className="block text-xs leading-5 text-stone-600">
            Evite rosto, pulseira, etiqueta ou prontuario visivel. Use apenas imagem demo/local nesta fase.
          </span>
          <span className="flex items-center gap-2 text-xs text-stone-600">
            <input name="postMealImageIdentifier" type="checkbox" className="h-4 w-4" /> Possivel identificador visivel
          </span>
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Itens servidos</h2>
          <button type="button" onClick={addRow} className="inline-flex items-center gap-2 rounded-md border border-stone-300 px-3 py-2 text-sm font-semibold hover:bg-stone-50">
            <Plus className="h-4 w-4" /> Item
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-md border border-stone-200 bg-stone-50/80 p-3">
          <span className="mr-1 text-xs font-semibold uppercase text-stone-500">Atalhos</span>
          {mealPresets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyMealPreset(preset)}
              className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-800 transition-colors hover:bg-stone-100"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold uppercase text-stone-500">Ingesta rapida</span>
          {percents.map((percentOption) => (
            <button
              key={percentOption}
              type="button"
              onClick={() => applyConsumedPercentToAllRows(percentOption)}
              className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50"
            >
              {consumedPercentLabels[percentOption]}
            </button>
          ))}
        </div>

        {rows.map((row) => {
          const food = foods.find((item) => item.id === row.foodItemId);
          const multiplier = Number(row.servedPortionMultiplier);
          const percent = consumedPercentToValue[row.consumedPercent];
          const servedKcal = food ? food.kcalPerPortion * multiplier : 0;
          const servedProtein = food ? food.proteinPerPortion * multiplier : 0;
          const servedCarbs = food ? (food.carbsPerPortion ?? 0) * multiplier : 0;
          const servedFat = food ? (food.fatPerPortion ?? 0) * multiplier : 0;
          return (
            <div key={row.localId} className="grid gap-3 rounded-md border border-stone-200 bg-white p-3 shadow-sm shadow-stone-100/70 md:grid-cols-[2fr_1fr_1fr_2fr_1.5fr_auto]">
              <label className="space-y-1">
                <span className="text-xs font-medium text-stone-600">Preparacao</span>
                <select
                  name="foodItemId"
                  value={row.foodItemId}
                  onChange={(event) => updateRow(row.localId, { foodItemId: event.target.value })}
                  className="w-full rounded-md border border-stone-300 px-3 py-2"
                >
                  {foods.map((foodItem) => (
                    <option key={foodItem.id} value={foodItem.id}>
                      {foodItem.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-stone-600">Porcao</span>
                <select
                  name="servedPortionMultiplier"
                  value={row.servedPortionMultiplier}
                  onChange={(event) => updateRow(row.localId, { servedPortionMultiplier: event.target.value })}
                  className="w-full rounded-md border border-stone-300 px-3 py-2"
                >
                  {multipliers.map((multiplierOption) => (
                    <option key={multiplierOption} value={multiplierOption}>
                      {multiplierOption}x
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-stone-600">Ingerido</span>
                <select
                  name="consumedPercent"
                  value={row.consumedPercent}
                  onChange={(event) => updateRow(row.localId, { consumedPercent: event.target.value as ConsumedPercentKey })}
                  className="w-full rounded-md border border-stone-300 px-3 py-2"
                >
                  {percents.map((percentOption) => (
                    <option key={percentOption} value={percentOption}>
                      {consumedPercentLabels[percentOption]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-stone-600">Observacao do item</span>
                <input
                  name="itemNotes"
                  value={row.itemNotes}
                  onChange={(event) => updateRow(row.localId, { itemNotes: event.target.value })}
                  placeholder="Ex.: recusou metade"
                  className="w-full rounded-md border border-stone-300 px-3 py-2"
                />
              </label>
              <div className="rounded-md border border-stone-200 bg-stone-50/80 px-3 py-2 text-sm text-stone-700">
                <div>{servedKcal.toFixed(0)} kcal servidas</div>
                <div>{servedProtein.toFixed(1)} g proteina servida</div>
                <div>{servedCarbs.toFixed(1)} g CHO servidos</div>
                <div>{servedFat.toFixed(1)} g LIP servidos</div>
                <div>{((servedKcal * percent) / 100).toFixed(0)} kcal ingeridas</div>
                <div>{((servedProtein * percent) / 100).toFixed(1)} g proteina ingerida</div>
                <div>{((servedCarbs * percent) / 100).toFixed(1)} g CHO ingeridos</div>
                <div>{((servedFat * percent) / 100).toFixed(1)} g LIP ingeridos</div>
              </div>
              <button
                type="button"
                onClick={() => setRows((current) => current.filter((item) => item.localId !== row.localId))}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-stone-300 bg-white text-stone-600 transition-colors hover:bg-stone-50"
                title="Remover item"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 rounded-md border border-emerald-100 bg-emerald-50/90 p-4 text-sm shadow-sm shadow-emerald-100/60 md:grid-cols-4">
        <div>
          <span className="block text-emerald-900/70">Kcal servidas</span>
          <strong className="text-lg text-emerald-950">{totals.servedKcal.toFixed(0)}</strong>
        </div>
        <div>
          <span className="block text-emerald-900/70">Proteina servida</span>
          <strong className="text-lg text-emerald-950">{totals.servedProtein.toFixed(1)} g</strong>
        </div>
        <div>
          <span className="block text-emerald-900/70">CHO servido</span>
          <strong className="text-lg text-emerald-950">{totals.servedCarbs.toFixed(1)} g</strong>
        </div>
        <div>
          <span className="block text-emerald-900/70">LIP servido</span>
          <strong className="text-lg text-emerald-950">{totals.servedFat.toFixed(1)} g</strong>
        </div>
        <div>
          <span className="block text-emerald-900/70">Kcal ingeridas</span>
          <strong className="text-lg text-emerald-950">{totals.consumedKcal.toFixed(0)}</strong>
        </div>
        <div>
          <span className="block text-emerald-900/70">Proteina ingerida</span>
          <strong className="text-lg text-emerald-950">{totals.consumedProtein.toFixed(1)} g</strong>
        </div>
        <div>
          <span className="block text-emerald-900/70">CHO ingerido</span>
          <strong className="text-lg text-emerald-950">{totals.consumedCarbs.toFixed(1)} g</strong>
        </div>
        <div>
          <span className="block text-emerald-900/70">LIP ingerido</span>
          <strong className="text-lg text-emerald-950">{totals.consumedFat.toFixed(1)} g</strong>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button name="intent" value="finalize" className="w-full rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-900 sm:w-auto">
          Finalizar
        </button>
        <button name="intent" value="review" className="w-full rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-semibold transition-colors hover:bg-stone-50 sm:w-auto">
          Marcar para revisao da nutricao
        </button>
      </div>
    </form>
  );
}

function MobileStickyTotals({
  totals,
  itemCount,
}: {
  totals: {
    consumedKcal: number;
    consumedProtein: number;
    consumedCarbs: number;
    consumedFat: number;
  };
  itemCount: number;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-emerald-200 bg-white/95 px-3 py-3 shadow-lg shadow-stone-400/20 backdrop-blur lg:hidden" aria-live="polite">
      <div className="mx-auto max-w-7xl">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase text-stone-500">Resumo da ingesta</div>
            <div className="text-xs text-stone-500">{itemCount} item(ns)</div>
          </div>
          <button name="intent" value="finalize" className="rounded-md bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
            Finalizar
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <MobileTotal label="Kcal" value={totals.consumedKcal.toFixed(0)} />
          <MobileTotal label="PTN" value={`${totals.consumedProtein.toFixed(1)} g`} />
          <MobileTotal label="CHO" value={`${totals.consumedCarbs.toFixed(1)} g`} />
          <MobileTotal label="LIP" value={`${totals.consumedFat.toFixed(1)} g`} />
        </div>
      </div>
    </div>
  );
}

function MobileTotal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-emerald-50 px-2 py-1.5">
      <div className="font-semibold text-emerald-950">{value}</div>
      <div className="text-[10px] font-semibold uppercase text-emerald-900/70">{label}</div>
    </div>
  );
}
