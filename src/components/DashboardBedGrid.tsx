"use client";

import Link from "next/link";
import { Camera, ClipboardList, Filter } from "lucide-react";
import { useMemo, useState } from "react";
import type { AlertLevel, MealType } from "@/generated/prisma/enums";
import { mealReportLabels } from "@/components/MealNutrientReport";
import { NutritionProgress } from "@/components/NutritionProgress";
import { StatusBadge } from "@/components/StatusBadge";
import { mealTypeLabels } from "@/lib/labels";
import type { MealReportMealType } from "@/lib/clinical/calculations";

type DashboardFilter = "todos" | "alertas" | "revisao" | "pendencias" | "livres";

type DashboardSummary = {
  alertLevel: AlertLevel;
  totalConsumedKcal: number;
  kcalTarget: number;
  kcalTargetPercent: number;
  totalConsumedProtein: number;
  proteinTarget: number;
  proteinTargetPercent: number;
};

export type DashboardBedCardData = {
  bedId: string;
  bedName: string;
  admissionId: string | null;
  patientCode: string | null;
  transplantDay: string | null;
  dietType: string | null;
  summary: DashboardSummary | null;
  mealTypes: MealType[];
  pendingMeals: number;
  operationalPendingMeals: number;
  missingLunch: boolean;
  lowestKcalMeal: MealReportMealType | "TOTAL" | null;
  lowestProteinMeal: MealReportMealType | "TOTAL" | null;
  hasNutritionAlert: boolean;
  hasReview: boolean;
  hasOperationalPending: boolean;
  isFree: boolean;
};

const filterLabels: Record<DashboardFilter, string> = {
  todos: "Todos",
  alertas: "Alertas",
  revisao: "Revisao",
  pendencias: "Pendencias",
  livres: "Livres",
};

export function DashboardBedGrid({ cards }: { cards: DashboardBedCardData[] }) {
  const [activeFilter, setActiveFilter] = useState<DashboardFilter>("todos");

  const counts = useMemo(
    () => ({
      todos: cards.length,
      alertas: cards.filter((card) => card.hasNutritionAlert).length,
      revisao: cards.filter((card) => card.hasReview).length,
      pendencias: cards.filter((card) => card.hasOperationalPending).length,
      livres: cards.filter((card) => card.isFree).length,
    }),
    [cards],
  );

  const visibleCards = useMemo(() => {
    if (activeFilter === "alertas") return cards.filter((card) => card.hasNutritionAlert);
    if (activeFilter === "revisao") return cards.filter((card) => card.hasReview);
    if (activeFilter === "pendencias") return cards.filter((card) => card.hasOperationalPending);
    if (activeFilter === "livres") return cards.filter((card) => card.isFree);
    return cards;
  }, [activeFilter, cards]);

  const filterOrder: DashboardFilter[] = ["todos", "alertas", "revisao", "pendencias", "livres"];

  return (
    <section className="space-y-3">
      <div className="rounded-md border border-stone-200 bg-white p-3 shadow-sm shadow-stone-200/50">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-stone-500">
            <Filter className="h-3.5 w-3.5" />
            Filtros
          </span>
          {filterOrder.map((filter) => (
            <button
              key={filter}
              type="button"
              aria-pressed={activeFilter === filter}
              onClick={() => setActiveFilter(filter)}
              className={`inline-flex min-h-9 items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors ${
                activeFilter === filter
                  ? "border-emerald-800 bg-emerald-800 text-white"
                  : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
              }`}
            >
              {filterLabels[filter]}
              <span className={`rounded-md px-1.5 py-0.5 text-xs ${activeFilter === filter ? "bg-white/20" : "bg-stone-100 text-stone-600"}`}>
                {counts[filter]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {visibleCards.length === 0 ? (
        <div className="rounded-md border border-stone-200 bg-white p-6 text-sm text-stone-600 shadow-sm shadow-stone-200/50">
          Nenhum leito encontrado para o filtro selecionado.
        </div>
      ) : null}

      <div className="grid gap-3 xl:grid-cols-2">
        {visibleCards.map((card) => (
          <DashboardBedCard key={card.bedId} card={card} />
        ))}
      </div>
    </section>
  );
}

function DashboardBedCard({ card }: { card: DashboardBedCardData }) {
  return (
    <div className="rounded-md border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/50">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase text-emerald-900">{card.bedName}</div>
          {card.admissionId && card.patientCode ? (
            <Link href={`/patients/${card.admissionId}`} className="mt-1 block text-xl font-semibold leading-tight hover:text-emerald-900">
              {card.patientCode}
            </Link>
          ) : (
            <div className="mt-1 text-xl font-semibold leading-tight text-stone-400">Leito livre</div>
          )}
        </div>
        {card.summary ? (
          <StatusBadge level={card.summary.alertLevel} />
        ) : (
          <span className="rounded-md border border-stone-200 px-2 py-1 text-xs text-stone-500">Sem resumo</span>
        )}
      </div>

      {card.admissionId ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md bg-stone-50 p-3 text-sm">
            <div className="text-xs uppercase text-stone-500">D+ / transplante</div>
            <div className="font-semibold">{card.transplantDay ?? "Nao informado"}</div>
          </div>
          <div className="rounded-md bg-stone-50 p-3 text-sm">
            <div className="text-xs uppercase text-stone-500">Dieta atual</div>
            <div className="font-semibold">{card.dietType ?? "Sem prescricao"}</div>
          </div>
        </div>
      ) : null}

      {card.summary ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <NutritionProgress
            label="Meta calorica"
            consumed={card.summary.totalConsumedKcal}
            target={card.summary.kcalTarget}
            percent={card.summary.kcalTargetPercent}
            unit="kcal"
            tone="kcal"
          />
          <NutritionProgress
            label="Meta proteica"
            consumed={card.summary.totalConsumedProtein}
            target={card.summary.proteinTarget}
            percent={card.summary.proteinTargetPercent}
            unit="g"
            precision={1}
            tone="protein"
          />
        </div>
      ) : card.admissionId ? (
        <div className="mt-3 rounded-md bg-stone-50 p-3 text-sm text-stone-600">Resumo diario ainda nao gerado para este leito.</div>
      ) : null}

      {card.mealTypes.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {card.mealTypes.slice(0, 4).map((mealType) => (
            <span key={mealType} className="inline-flex items-center gap-1 rounded-md border border-stone-200 px-2 py-1 text-xs text-stone-600">
              <Camera className="h-3 w-3" /> {mealTypeLabels[mealType]}
            </span>
          ))}
        </div>
      ) : null}

      {card.pendingMeals > 0 ? (
        <div className="mt-3 text-sm font-medium text-orange-800">{card.pendingMeals} revisao(oes) aberta(s).</div>
      ) : null}
      {card.operationalPendingMeals > 0 ? (
        <div className="mt-1 text-sm font-medium text-slate-700">{card.operationalPendingMeals} registro(s) de ingesta incompleto(s) no dia.</div>
      ) : null}
      {card.admissionId ? (
        <div className="mt-3 space-y-1 rounded-md border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">
          {card.missingLunch ? <div className="font-medium text-slate-800">Sem registro no almoco.</div> : null}
          {card.lowestKcalMeal ? <div>Menor ingesta hoje: {mealReportLabels[card.lowestKcalMeal].toLowerCase()}.</div> : null}
          {card.lowestProteinMeal ? <div>Menor proteina hoje: {mealReportLabels[card.lowestProteinMeal].toLowerCase()}.</div> : null}
          {!card.missingLunch && !card.lowestKcalMeal && !card.lowestProteinMeal ? (
            <div className="inline-flex items-center gap-2 text-stone-600">
              <ClipboardList className="h-4 w-4" /> Sem destaque operacional no dia.
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
