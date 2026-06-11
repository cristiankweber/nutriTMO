import type { AlertLevel } from "@/generated/prisma/enums";
import { cn } from "@/lib/ui/cn";
import { alertClasses, alertLabels } from "@/lib/labels";

export function StatusBadge({ level }: { level: AlertLevel }) {
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold shadow-sm shadow-stone-200/40", alertClasses[level])}>
      {alertLabels[level]}
    </span>
  );
}
