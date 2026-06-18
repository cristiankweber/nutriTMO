import type { MealStatus } from "@/generated/prisma/client";
import { addDays, localDateKey, startOfLocalDay } from "@/lib/dates";

type SummaryRefreshPlanningInput = {
  fromDate: Date;
  throughDate?: Date;
  existingSummaryDates?: Date[];
  mealDates?: Date[];
};

const compareDates = (a: Date, b: Date) => a.getTime() - b.getTime();

export const effectivePrescriptionCutoff = (date: Date) => startOfLocalDay(date);

export const canReviewMealStatus = (status: MealStatus) => status !== "REVISADA" && status !== "CANCELADA";

export const canCancelMealStatus = (status: MealStatus) => status !== "CANCELADA";

export const getAffectedSummaryDatesForPrescriptionChange = ({
  fromDate,
  throughDate = new Date(),
  existingSummaryDates = [],
  mealDates = [],
}: SummaryRefreshPlanningInput) => {
  const from = startOfLocalDay(fromDate);
  const through = startOfLocalDay(throughDate);
  if (from.getTime() > through.getTime()) return [];

  const candidates = new Map<string, Date>();
  const addCandidate = (date: Date) => {
    const day = startOfLocalDay(date);
    if (day.getTime() < from.getTime() || day.getTime() > through.getTime()) return;
    candidates.set(localDateKey(day), day);

    const nextDay = addDays(day, 1);
    if (nextDay.getTime() <= through.getTime()) {
      candidates.set(localDateKey(nextDay), nextDay);
    }
  };

  addCandidate(from);
  addCandidate(through);
  existingSummaryDates.forEach(addCandidate);
  mealDates.forEach(addCandidate);

  return [...candidates.values()].sort(compareDates);
};
