import { describe, expect, it } from "vitest";
import { addDays, localDateKey, localDayRange, parseDateInputValue, startOfLocalDay, toDateInputValue } from "../src/lib/dates";

describe("datas locais", () => {
  it("normaliza inicio do dia local", () => {
    const date = new Date(2026, 5, 17, 15, 30, 0);
    expect(startOfLocalDay(date).getHours()).toBe(0);
    expect(startOfLocalDay(date).getDate()).toBe(17);
  });

  it("gera intervalo de um dia local", () => {
    const { start, end } = localDayRange(new Date(2026, 5, 17, 8, 0, 0));
    expect(localDateKey(start)).toBe("2026-06-17");
    expect(localDateKey(end)).toBe("2026-06-18");
  });

  it("converte input date sem deslocar timezone", () => {
    expect(toDateInputValue(new Date(2026, 5, 17))).toBe("2026-06-17");
    expect(parseDateInputValue("2026-06-17")?.getDate()).toBe(17);
    expect(parseDateInputValue("2026-06-31")).toBeNull();
  });

  it("soma dias no calendario local", () => {
    const next = addDays(new Date(2026, 5, 30), 1);
    expect(localDateKey(next)).toBe("2026-07-01");
  });
});
