import { describe, expect, it } from "vitest";
import {
  differenceInLocalCalendarDays,
  formatTransplantDay,
  getDisplayTransplantDay,
  parseTransplantDay,
} from "../src/lib/transplantDay";

describe("D+ dinamico do transplante", () => {
  it("interpreta notacoes D+, D- e D0", () => {
    expect(parseTransplantDay("D+5")).toBe(5);
    expect(parseTransplantDay("d - 2")).toBe(-2);
    expect(parseTransplantDay("D0")).toBe(0);
    expect(parseTransplantDay("D+0")).toBe(0);
    expect(parseTransplantDay("texto livre")).toBeNull();
  });

  it("formata valores negativos, zero e positivos", () => {
    expect(formatTransplantDay(-2)).toBe("D-2");
    expect(formatTransplantDay(0)).toBe("D+0");
    expect(formatTransplantDay(7)).toBe("D+7");
  });

  it("calcula diferenca por dia local, ignorando horario", () => {
    expect(differenceInLocalCalendarDays(new Date("2026-06-10T23:30:00"), new Date("2026-06-11T01:00:00"))).toBe(1);
    expect(differenceInLocalCalendarDays(new Date("2026-06-11T01:00:00"), new Date("2026-06-10T23:30:00"))).toBe(-1);
  });

  it("mantem o D+ de referencia no mesmo dia da admissao", () => {
    expect(getDisplayTransplantDay("D+5", new Date("2026-06-10T00:00:00"), new Date("2026-06-10T23:59:00"))).toBe("D+5");
  });

  it("avanca o D+ a cada dia desde a admissao", () => {
    expect(getDisplayTransplantDay("D+5", new Date("2026-06-10T00:00:00"), new Date("2026-06-13T08:00:00"))).toBe("D+8");
  });

  it("permite que D- atravesse para D+", () => {
    expect(getDisplayTransplantDay("D-2", new Date("2026-06-10T00:00:00"), new Date("2026-06-13T08:00:00"))).toBe("D+1");
  });

  it("preserva valores nao padronizados em vez de esconder informacao clinica", () => {
    expect(getDisplayTransplantDay("aguardando data", new Date("2026-06-10T00:00:00"), new Date("2026-06-13T08:00:00"))).toBe("aguardando data");
    expect(getDisplayTransplantDay(null, new Date("2026-06-10T00:00:00"), new Date("2026-06-13T08:00:00"))).toBeNull();
  });
});
