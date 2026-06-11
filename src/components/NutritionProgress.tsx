import { cn } from "@/lib/ui/cn";

type NutritionProgressTone = "kcal" | "protein" | "neutral";

const toneClasses: Record<NutritionProgressTone, { bar: string; soft: string; text: string }> = {
  kcal: {
    bar: "bg-emerald-700",
    soft: "bg-emerald-50",
    text: "text-emerald-950",
  },
  protein: {
    bar: "bg-sky-700",
    soft: "bg-sky-50",
    text: "text-sky-950",
  },
  neutral: {
    bar: "bg-stone-700",
    soft: "bg-stone-50",
    text: "text-stone-950",
  },
};

const clampPercent = (value: number) => Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));

export function NutritionProgress({
  label,
  consumed,
  target,
  percent,
  unit,
  precision = 0,
  tone = "neutral",
}: {
  label: string;
  consumed: number;
  target: number;
  percent: number;
  unit: string;
  precision?: number;
  tone?: NutritionProgressTone;
}) {
  const visiblePercent = clampPercent(percent);
  const palette = toneClasses[tone];

  return (
    <div className={cn("rounded-md border border-white/70 p-3 shadow-sm shadow-stone-200/40", palette.soft)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase text-stone-500">{label}</div>
          <div className={cn("mt-1 text-lg font-semibold", palette.text)}>
            {consumed.toFixed(precision)} {unit}
          </div>
        </div>
        <div className="text-right">
          <div className={cn("text-lg font-semibold", palette.text)}>{percent.toFixed(0)}%</div>
          <div className="text-xs text-stone-500">meta {target.toFixed(precision)} {unit}</div>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/90">
        <div className={cn("h-full rounded-full", palette.bar)} style={{ width: `${visiblePercent}%` }} />
      </div>
    </div>
  );
}
