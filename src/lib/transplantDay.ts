import { startOfLocalDay } from "./dates";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const localCalendarDayOrdinal = (date: Date) => {
  const localDay = startOfLocalDay(date);
  return Date.UTC(localDay.getFullYear(), localDay.getMonth(), localDay.getDate()) / MS_PER_DAY;
};

export const differenceInLocalCalendarDays = (start: Date, end: Date) =>
  localCalendarDayOrdinal(end) - localCalendarDayOrdinal(start);

export const parseTransplantDay = (value: string | null | undefined) => {
  const match = value?.trim().match(/^d\s*([+-])?\s*(\d+)$/i);
  if (!match) return null;

  const [, sign, numericValue] = match;
  const absoluteDay = Number(numericValue);
  if (!Number.isFinite(absoluteDay)) return null;

  return sign === "-" ? -absoluteDay : absoluteDay;
};

export const formatTransplantDay = (day: number) => (day < 0 ? `D${day}` : `D+${day}`);

export const getDisplayTransplantDay = (
  baselineTransplantDay: string | null | undefined,
  admissionDate: Date,
  referenceDate = new Date(),
) => {
  const rawValue = baselineTransplantDay?.trim();
  if (!rawValue) return null;

  const baselineDay = parseTransplantDay(rawValue);
  if (baselineDay === null) return rawValue;

  const elapsedDays = differenceInLocalCalendarDays(admissionDate, referenceDate);
  return formatTransplantDay(baselineDay + elapsedDays);
};
