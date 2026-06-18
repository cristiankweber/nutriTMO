import { describe, expect, it } from "vitest";
import {
  canCancelMealStatus,
  canReviewMealStatus,
  effectivePrescriptionCutoff,
  getAffectedSummaryDatesForPrescriptionChange,
} from "../src/lib/clinical/operationalRules";
import { localDateKey, localDayRange, parseDateInputValue } from "../src/lib/dates";

describe("regras operacionais de data e estado clinico", () => {
  it("mantem o intervalo diario fechado no inicio e aberto no proximo dia", () => {
    const { start, end } = localDayRange(new Date("2026-06-12T21:35:00"));

    expect(localDateKey(start)).toBe("2026-06-12");
    expect(localDateKey(end)).toBe("2026-06-13");
  });

  it("normaliza e valida input de data sem aceitar datas inexistentes", () => {
    expect(localDateKey(parseDateInputValue("2026-06-12")!)).toBe("2026-06-12");
    expect(parseDateInputValue("2026-02-30")).toBeNull();
    expect(parseDateInputValue("12/06/2026")).toBeNull();
  });

  it("usa o inicio do dia como corte de prescricao vigente", () => {
    const cutoff = effectivePrescriptionCutoff(new Date("2026-06-12T23:59:00"));

    expect(localDateKey(cutoff)).toBe("2026-06-12");
  });

  it("planeja recalculo de resumos afetados por prescricao retroativa e cascata do dia seguinte", () => {
    const dates = getAffectedSummaryDatesForPrescriptionChange({
      fromDate: new Date("2026-06-10T00:00:00"),
      throughDate: new Date("2026-06-13T00:00:00"),
      existingSummaryDates: [new Date("2026-06-12T00:00:00")],
      mealDates: [new Date("2026-06-10T16:30:00")],
    }).map(localDateKey);

    expect(dates).toEqual(["2026-06-10", "2026-06-11", "2026-06-12", "2026-06-13"]);
  });

  it("nao recalcula resumos quando a prescricao e futura", () => {
    expect(
      getAffectedSummaryDatesForPrescriptionChange({
        fromDate: new Date("2026-06-15T00:00:00"),
        throughDate: new Date("2026-06-13T00:00:00"),
      }),
    ).toEqual([]);
  });

  it("bloqueia transicoes duplicadas ou impossiveis de refeicao", () => {
    expect(canReviewMealStatus("FINALIZADA")).toBe(true);
    expect(canReviewMealStatus("PARCIALMENTE_REGISTRADA")).toBe(true);
    expect(canReviewMealStatus("REVISADA")).toBe(false);
    expect(canReviewMealStatus("CANCELADA")).toBe(false);

    expect(canCancelMealStatus("REVISADA")).toBe(true);
    expect(canCancelMealStatus("CANCELADA")).toBe(false);
  });
});
