import { describe, expect, it } from "vitest";
import { hasHighRiskClinicalNote } from "../src/lib/clinical/clinicalNotes";

describe("observacoes clinicas", () => {
  it("detecta alto risco no texto", () => {
    expect(hasHighRiskClinicalNote("Observacao ficticia: alto risco nutricional para demonstracao.")).toBe(true);
  });

  it("ignora texto sem alto risco", () => {
    expect(hasHighRiskClinicalNote("Paciente estavel para demo.")).toBe(false);
    expect(hasHighRiskClinicalNote(null)).toBe(false);
  });
});
