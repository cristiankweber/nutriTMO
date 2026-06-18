export const hasHighRiskClinicalNote = (clinicalNotes: string | null | undefined) =>
  clinicalNotes?.toLowerCase().includes("alto risco") ?? false;
