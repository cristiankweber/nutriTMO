export function MetricCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-md border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/50">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase text-stone-500">{label}</div>
          <div className="mt-2 text-2xl font-semibold leading-none text-stone-950">{value}</div>
        </div>
        <div className="mt-1 h-8 w-1.5 rounded-full bg-emerald-700/80" aria-hidden="true" />
      </div>
      {detail ? <div className="mt-2 text-sm leading-5 text-stone-500">{detail}</div> : null}
    </div>
  );
}
