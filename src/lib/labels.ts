import type {
  AlertLevel,
  Confidence,
  ConsumedPercent,
  FoodCategory,
  ImageQuality,
  MealStatus,
  MealType,
  Role,
  TransplantType,
} from "@/generated/prisma/enums";

export const roleLabels: Record<Role, string> = {
  ADMIN: "Admin",
  NUTRICAO: "Nutrição",
  ENFERMAGEM: "Enfermagem",
  MEDICO: "Médico",
  AUDITOR: "Auditor",
};

export const transplantTypeLabels: Record<TransplantType, string> = {
  AUTOLOGO: "Autólogo",
  ALOGENICO: "Alogênico",
  HAPLOIDENTICO: "Haploidêntico",
  CORDONAL: "Cordonal",
  NAO_INFORMADO: "Não informado",
};

export const foodCategoryLabels: Record<FoodCategory, string> = {
  CARBOIDRATO: "Carboidrato",
  PROTEINA: "Proteína",
  LEGUMINOSA: "Leguminosa",
  VEGETAL: "Vegetal",
  FRUTA: "Fruta",
  SOBREMESA: "Sobremesa",
  SUPLEMENTO: "Suplemento",
  BEBIDA: "Bebida",
  OUTRO: "Outro",
};

export const mealTypeLabels: Record<MealType, string> = {
  CAFE_MANHA: "Café da manhã",
  LANCHE_MANHA: "Lanche da manhã",
  ALMOCO: "Almoço",
  LANCHE_TARDE: "Lanche da tarde",
  JANTAR: "Jantar",
  CEIA: "Ceia",
  SUPLEMENTO: "Suplemento",
  OUTRO: "Outro",
};

export const mealStatusLabels: Record<MealStatus, string> = {
  PLANEJADA: "Planejada",
  SERVIDA: "Servida",
  PARCIALMENTE_REGISTRADA: "Parcial",
  FINALIZADA: "Finalizada",
  REVISADA: "Revisada",
  CANCELADA: "Cancelada",
};

export const imageQualityLabels: Record<ImageQuality, string> = {
  ADEQUADA: "Adequada",
  INADEQUADA: "Inadequada",
  NAO_AVALIADA: "Não avaliada",
};

export const confidenceLabels: Record<Confidence, string> = {
  ALTA: "Alta",
  MEDIA: "Média",
  BAIXA: "Baixa",
  NAO_APLICAVEL: "Não aplicável",
};

export const consumedPercentLabels: Record<ConsumedPercent, string> = {
  ZERO: "0%",
  TWENTY_FIVE: "25%",
  FIFTY: "50%",
  SEVENTY_FIVE: "75%",
  ONE_HUNDRED: "100%",
};

export const alertLabels: Record<AlertLevel, string> = {
  VERDE: "Adequada",
  AMARELO: "Atenção",
  LARANJA: "Baixa ingesta",
  VERMELHO: "Baixa persistente",
  CINZA: "Pendência do dia",
};

export const alertClasses: Record<AlertLevel, string> = {
  VERDE: "border-emerald-200 bg-emerald-50 text-emerald-900",
  AMARELO: "border-amber-200 bg-amber-50 text-amber-900",
  LARANJA: "border-orange-200 bg-orange-50 text-orange-900",
  VERMELHO: "border-rose-200 bg-rose-50 text-rose-900",
  CINZA: "border-slate-200 bg-slate-100 text-slate-800",
};
