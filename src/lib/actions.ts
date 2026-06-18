"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  Confidence,
  ConsumedPercent,
  FoodCategory,
  ImageAssetType,
  ImageQuality,
  MealStatus,
  MealType,
} from "@/generated/prisma/client";
import { writeAuditLog } from "@/lib/audit";
import {
  assertAllowed,
  canManageGovernance,
  canManageMenu,
  canManagePatients,
  canManagePrescriptions,
  canRegisterMeals,
  canReviewMeals,
  canViewReports,
} from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import {
  buildDailySummary,
  calculateConsumedCarbs,
  calculateConsumedFat,
  calculateConsumedKcal,
  calculateConsumedProtein,
  calculateMealItemNutrition,
  consumedPercentToValue,
} from "@/lib/clinical/calculations";
import {
  canCancelMealStatus,
  canReviewMealStatus,
  effectivePrescriptionCutoff,
  getAffectedSummaryDatesForPrescriptionChange,
} from "@/lib/clinical/operationalRules";
import { addDays, localDayRange, startOfLocalDay } from "@/lib/dates";
import { db } from "@/lib/db";
import { buildReviewMetadata } from "@/lib/review/rules";
import { storeLocalImage } from "@/lib/storage/local";
import { purgeExpiredLocalImages } from "@/lib/storage/retention";

const requiredString = (formData: FormData, key: string) => {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Campo obrigatorio ausente: ${key}`);
  }
  return value.trim();
};

const optionalString = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
};

const numberField = (formData: FormData, key: string) => {
  const value = Number(requiredString(formData, key).replace(",", "."));
  if (!Number.isFinite(value)) throw new Error(`Numero invalido: ${key}`);
  return value;
};

const optionalNumberField = (formData: FormData, key: string) => {
  const value = optionalString(formData, key);
  if (!value) return null;
  const number = Number(value.replace(",", "."));
  return Number.isFinite(number) ? number : null;
};

const dateField = (formData: FormData, key: string) => startOfLocalDay(new Date(`${requiredString(formData, key)}T00:00:00`));

const safePercent = (value: FormDataEntryValue | null): ConsumedPercent => {
  if (value === "TWENTY_FIVE") return "TWENTY_FIVE";
  if (value === "FIFTY") return "FIFTY";
  if (value === "SEVENTY_FIVE") return "SEVENTY_FIVE";
  if (value === "ONE_HUNDRED") return "ONE_HUNDRED";
  return "ZERO";
};

const criticalMealTypes: MealType[] = ["CAFE_MANHA", "ALMOCO", "JANTAR"];

const requireActiveAdmission = async (admissionId: string) => {
  const admission = await db.admission.findUnique({ where: { id: admissionId } });
  if (!admission?.active) throw new Error("Apenas admissoes ativas podem receber registros clinicos.");
  return admission;
};

const assertMealCanBeReviewed = (status: MealStatus) => {
  if (!canReviewMealStatus(status)) throw new Error("Esta refeicao nao pode ser revisada no estado atual.");
};

const assertMealCanBeCancelled = (status: MealStatus) => {
  if (!canCancelMealStatus(status)) throw new Error("Esta refeicao ja esta cancelada.");
};

export async function refreshDailySummary(admissionId: string, date: Date) {
  const { start, end } = localDayRange(date);
  const [admission, prescription, meals, previousSummary] = await Promise.all([
    db.admission.findUnique({ where: { id: admissionId } }),
    db.nutritionPrescription.findFirst({
      where: { admissionId, date: { lte: effectivePrescriptionCutoff(start) } },
      orderBy: { date: "desc" },
    }),
    db.meal.findMany({
      where: { admissionId, date: { gte: start, lt: end }, status: { not: "CANCELADA" } },
      include: { items: true },
    }),
    db.nutritionDailySummary.findUnique({
      where: { admissionId_date: { admissionId, date: addDays(start, -1) } },
    }),
  ]);

  if (!admission || !prescription) return null;

  const registeredCriticalMeals = new Set(meals.map((meal) => meal.mealType).filter((mealType) => criticalMealTypes.includes(mealType)));
  const missingCriticalMealsCount = criticalMealTypes.filter((mealType) => !registeredCriticalMeals.has(mealType)).length;
  const hasInadequatePhotoWithoutReview = meals.some(
    (meal) => meal.imageQuality === "INADEQUADA" && meal.status !== "REVISADA",
  );

  const previousDayHadLowIntake = previousSummary
    ? previousSummary.kcalTargetPercent < 50 ||
      previousSummary.proteinTargetPercent < 50 ||
      previousSummary.alertLevel === "LARANJA" ||
      previousSummary.alertLevel === "VERMELHO"
    : false;

  const summary = buildDailySummary({
    admissionId,
    date: start,
    items: meals.flatMap((meal) => meal.items),
    kcalTarget: prescription.kcalTarget,
    proteinTarget: prescription.proteinTarget,
    missingCriticalMealsCount,
    hasInadequatePhotoWithoutReview,
    previousDayHadLowIntake,
    hasHighRiskClinicalNote: admission.clinicalNotes?.toLowerCase().includes("alto risco") ?? false,
  });

  return db.nutritionDailySummary.upsert({
    where: { admissionId_date: { admissionId, date: start } },
    create: summary,
    update: {
      totalServedKcal: summary.totalServedKcal,
      totalConsumedKcal: summary.totalConsumedKcal,
      kcalTarget: summary.kcalTarget,
      kcalTargetPercent: summary.kcalTargetPercent,
      totalServedProtein: summary.totalServedProtein,
      totalConsumedProtein: summary.totalConsumedProtein,
      proteinTarget: summary.proteinTarget,
      proteinTargetPercent: summary.proteinTargetPercent,
      missingMealsCount: summary.missingMealsCount,
      alertLevel: summary.alertLevel,
      generatedAt: new Date(),
    },
  });
}

async function refreshDailySummariesForPrescriptionChange(admissionId: string, dates: Date[]) {
  const today = startOfLocalDay();
  const startDates = dates.map(startOfLocalDay).sort((a, b) => a.getTime() - b.getTime());
  const fromDate = startDates[0];
  if (!fromDate || fromDate.getTime() > today.getTime()) return [];

  const throughDate = today;
  const [existingSummaries, meals] = await Promise.all([
    db.nutritionDailySummary.findMany({
      where: { admissionId, date: { gte: fromDate, lte: throughDate } },
      select: { date: true },
    }),
    db.meal.findMany({
      where: { admissionId, date: { gte: fromDate, lt: addDays(throughDate, 1) } },
      select: { date: true },
    }),
  ]);

  const datesToRefresh = getAffectedSummaryDatesForPrescriptionChange({
    fromDate,
    throughDate,
    existingSummaryDates: existingSummaries.map((summary) => summary.date),
    mealDates: meals.map((meal) => meal.date),
  });

  const refreshedDates: Date[] = [];
  for (const summaryDate of datesToRefresh) {
    const summary = await refreshDailySummary(admissionId, summaryDate);
    if (summary) refreshedDates.push(summary.date);
  }
  return refreshedDates;
}

export async function createFoodItemAction(formData: FormData) {
  const user = await requireUser();
  assertAllowed(canManageMenu(user.role));

  const foodItem = await db.foodItem.create({
    data: {
      name: requiredString(formData, "name"),
      category: requiredString(formData, "category") as FoodCategory,
      standardPortionGrams: numberField(formData, "standardPortionGrams"),
      kcalPerPortion: numberField(formData, "kcalPerPortion"),
      proteinPerPortion: numberField(formData, "proteinPerPortion"),
      carbsPerPortion: optionalNumberField(formData, "carbsPerPortion"),
      fatPerPortion: optionalNumberField(formData, "fatPerPortion"),
      sodiumMgPerPortion: optionalNumberField(formData, "sodiumMgPerPortion"),
      active: formData.get("active") !== "off",
    },
  });

  await writeAuditLog({ userId: user.id, entityType: "FoodItem", entityId: foodItem.id, action: "CREATE", afterJson: foodItem });
  revalidatePath("/menu");
  revalidatePath("/meals/new");
  redirect("/menu?salvo=1");
}

export async function updateFoodItemAction(formData: FormData) {
  const user = await requireUser();
  assertAllowed(canManageMenu(user.role));
  const id = requiredString(formData, "id");
  const before = await db.foodItem.findUniqueOrThrow({ where: { id } });
  const after = await db.foodItem.update({
    where: { id },
    data: {
      name: requiredString(formData, "name"),
      category: requiredString(formData, "category") as FoodCategory,
      standardPortionGrams: numberField(formData, "standardPortionGrams"),
      kcalPerPortion: numberField(formData, "kcalPerPortion"),
      proteinPerPortion: numberField(formData, "proteinPerPortion"),
      carbsPerPortion: optionalNumberField(formData, "carbsPerPortion"),
      fatPerPortion: optionalNumberField(formData, "fatPerPortion"),
      sodiumMgPerPortion: optionalNumberField(formData, "sodiumMgPerPortion"),
      active: formData.get("active") === "on",
    },
  });
  await writeAuditLog({ userId: user.id, entityType: "FoodItem", entityId: id, action: "UPDATE", beforeJson: before, afterJson: after });
  revalidatePath("/menu");
  revalidatePath("/meals/new");
  redirect("/menu?salvo=1");
}

export async function createPrescriptionAction(formData: FormData) {
  const user = await requireUser();
  assertAllowed(canManagePrescriptions(user.role));

  const admissionId = requiredString(formData, "admissionId");
  const date = dateField(formData, "date");
  await requireActiveAdmission(admissionId);

  const prescription = await db.nutritionPrescription.create({
    data: {
      admissionId,
      date,
      dietType: requiredString(formData, "dietType"),
      consistency: requiredString(formData, "consistency"),
      restrictions: optionalString(formData, "restrictions"),
      kcalTarget: numberField(formData, "kcalTarget"),
      proteinTarget: numberField(formData, "proteinTarget"),
      fluidRestriction: optionalString(formData, "fluidRestriction"),
      supplementsPlan: optionalString(formData, "supplementsPlan"),
      createdById: user.id,
      reviewedById: formData.get("reviewed") === "on" ? user.id : null,
    },
  });

  await writeAuditLog({
    userId: user.id,
    entityType: "NutritionPrescription",
    entityId: prescription.id,
    action: "CREATE",
    afterJson: prescription,
  });
  await refreshDailySummariesForPrescriptionChange(prescription.admissionId, [prescription.date]);
  revalidatePath("/prescriptions");
  revalidatePath("/dashboard");
  revalidatePath(`/patients/${prescription.admissionId}`);
  revalidatePath("/reports");
  redirect("/prescriptions?salvo=1");
}

export async function updatePrescriptionAction(formData: FormData) {
  const user = await requireUser();
  assertAllowed(canManagePrescriptions(user.role));

  const id = requiredString(formData, "id");
  const before = await db.nutritionPrescription.findUniqueOrThrow({ where: { id } });
  await requireActiveAdmission(before.admissionId);
  const after = await db.nutritionPrescription.update({
    where: { id },
    data: {
      date: dateField(formData, "date"),
      dietType: requiredString(formData, "dietType"),
      consistency: requiredString(formData, "consistency"),
      restrictions: optionalString(formData, "restrictions"),
      kcalTarget: numberField(formData, "kcalTarget"),
      proteinTarget: numberField(formData, "proteinTarget"),
      fluidRestriction: optionalString(formData, "fluidRestriction"),
      supplementsPlan: optionalString(formData, "supplementsPlan"),
      reviewedById: formData.get("reviewed") === "on" ? user.id : null,
    },
  });

  await writeAuditLog({
    userId: user.id,
    entityType: "NutritionPrescription",
    entityId: id,
    action: "UPDATE",
    beforeJson: before,
    afterJson: after,
  });
  await refreshDailySummariesForPrescriptionChange(after.admissionId, [before.date, after.date]);
  revalidatePath("/prescriptions");
  revalidatePath("/dashboard");
  revalidatePath(`/patients/${after.admissionId}`);
  revalidatePath("/reports");
  redirect("/prescriptions?salvo=1");
}

export async function createMealAction(formData: FormData) {
  const user = await requireUser();
  assertAllowed(canRegisterMeals(user.role));

  const admissionId = requiredString(formData, "admissionId");
  const date = dateField(formData, "date");
  await requireActiveAdmission(admissionId);
  const foodItemIds = formData.getAll("foodItemId").filter((value): value is string => typeof value === "string" && value !== "");
  const multipliers = formData.getAll("servedPortionMultiplier");
  const percents = formData.getAll("consumedPercent");
  const itemNotes = formData.getAll("itemNotes");

  if (foodItemIds.length === 0) throw new Error("Adicione ao menos um item servido.");

  const foods = await db.foodItem.findMany({ where: { id: { in: foodItemIds }, active: true } });
  const foodById = new Map(foods.map((food) => [food.id, food]));
  const mealItems = foodItemIds.map((foodItemId, index) => {
    const food = foodById.get(foodItemId);
    if (!food) throw new Error("Item da base alimentar inativo ou nao encontrado.");
    const multiplier = Number(String(multipliers[index] ?? "1").replace(",", "."));
    const consumedPercent = safePercent(percents[index] ?? null);
    const nutrition = calculateMealItemNutrition({
      kcalPerPortion: food.kcalPerPortion,
      proteinPerPortion: food.proteinPerPortion,
      carbsPerPortion: food.carbsPerPortion,
      fatPerPortion: food.fatPerPortion,
      servedPortionMultiplier: Number.isFinite(multiplier) ? multiplier : 1,
      consumedPercent: consumedPercentToValue[consumedPercent],
    });

    return {
      foodItemId,
      servedPortionMultiplier: Number.isFinite(multiplier) ? multiplier : 1,
      consumedPercent,
      notes: typeof itemNotes[index] === "string" && itemNotes[index] ? String(itemNotes[index]) : null,
      manuallyReviewed: false,
      ...nutrition,
    };
  });

  const intent = formData.get("intent");
  const meal = await db.meal.create({
    data: {
      admissionId,
      date,
      mealType: requiredString(formData, "mealType") as MealType,
      status: intent === "review" ? MealStatus.PARCIALMENTE_REGISTRADA : MealStatus.FINALIZADA,
      imageQuality: requiredString(formData, "imageQuality") as ImageQuality,
      confidence: requiredString(formData, "confidence") as Confidence,
      notes: optionalString(formData, "notes"),
      createdById: user.id,
      items: { create: mealItems },
    },
    include: { items: true },
  });

  const imageUpdates: { preMealImageUrl?: string; postMealImageUrl?: string } = {};
  for (const [field, type, updateKey] of [
    ["preMealImage", ImageAssetType.PRE_MEAL, "preMealImageUrl"],
    ["postMealImage", ImageAssetType.POST_MEAL, "postMealImageUrl"],
  ] as const) {
    const file = formData.get(field);
    if (file instanceof File && file.size > 0) {
      const stored = await storeLocalImage(file);
      if (stored) {
        const image = await db.imageAsset.create({
          data: {
            mealId: meal.id,
            type,
            storagePath: stored.storagePath,
            originalFilename: stored.originalFilename,
            mimeType: stored.mimeType,
            sizeBytes: stored.sizeBytes,
            uploadedById: user.id,
            containsPotentialIdentifier: formData.get(`${field}Identifier`) === "on",
            notes: optionalString(formData, `${field}Notes`),
          },
        });
        imageUpdates[updateKey] = `/api/images/${image.id}`;
      }
    }
  }

  const updatedMeal =
    Object.keys(imageUpdates).length > 0
      ? await db.meal.update({ where: { id: meal.id }, data: imageUpdates, include: { items: true, images: true } })
      : meal;

  await writeAuditLog({
    userId: user.id,
    entityType: "Meal",
    entityId: meal.id,
    action: "CREATE",
    afterJson: updatedMeal,
  });
  await refreshDailySummary(admissionId, date);
  revalidatePath("/dashboard");
  revalidatePath("/review");
  revalidatePath(`/patients/${admissionId}`);
  revalidatePath("/reports");
  redirect(`/patients/${admissionId}?refeicao=salva`);
}

export async function reviewMealAction(formData: FormData) {
  const user = await requireUser();
  assertAllowed(canReviewMeals(user.role));

  const mealId = requiredString(formData, "mealId");
  const before = await db.meal.findUniqueOrThrow({ where: { id: mealId }, include: { items: true } });
  assertMealCanBeReviewed(before.status);

  for (const item of before.items) {
    const consumedPercent = safePercent(formData.get(`percent-${item.id}`));
    await db.mealItem.update({
      where: { id: item.id },
      data: {
        consumedPercent,
        consumedKcal: calculateConsumedKcal(item.servedKcal, consumedPercentToValue[consumedPercent]),
        consumedProtein: calculateConsumedProtein(item.servedProtein, consumedPercentToValue[consumedPercent]),
        consumedCarbs: calculateConsumedCarbs(item.servedCarbs, consumedPercentToValue[consumedPercent]),
        consumedFat: calculateConsumedFat(item.servedFat, consumedPercentToValue[consumedPercent]),
        manuallyReviewed: true,
        notes: optionalString(formData, `notes-${item.id}`),
      },
    });
  }

  const reviewObservation = optionalString(formData, "mealNotes");
  const after = await db.meal.update({
    where: { id: mealId },
    data: {
      status: MealStatus.REVISADA,
      reviewedById: user.id,
      imageQuality: requiredString(formData, "imageQuality") as ImageQuality,
      confidence: requiredString(formData, "confidence") as Confidence,
      notes: reviewObservation,
    },
    include: { items: true },
  });
  const reviewMetadata = buildReviewMetadata(before, after, reviewObservation);

  await writeAuditLog({
    userId: user.id,
    entityType: "Meal",
    entityId: mealId,
    action: "REVIEW",
    beforeJson: before,
    afterJson: { ...after, reviewMetadata },
  });
  await refreshDailySummary(after.admissionId, after.date);
  revalidatePath("/review");
  revalidatePath("/dashboard");
  revalidatePath(`/patients/${after.admissionId}`);
  revalidatePath("/reports");
  revalidatePath("/audit");
  redirect("/review?salvo=1");
}

export async function cancelMealAction(formData: FormData) {
  const user = await requireUser();
  assertAllowed(canReviewMeals(user.role));

  const mealId = requiredString(formData, "mealId");
  const before = await db.meal.findUniqueOrThrow({ where: { id: mealId }, include: { items: true } });
  assertMealCanBeCancelled(before.status);
  const after = await db.meal.update({
    where: { id: mealId },
    data: {
      status: MealStatus.CANCELADA,
      reviewedById: user.id,
      notes: optionalString(formData, "cancelReason") ?? before.notes,
    },
    include: { items: true },
  });

  await writeAuditLog({
    userId: user.id,
    entityType: "Meal",
    entityId: mealId,
    action: "UPDATE",
    beforeJson: before,
    afterJson: { ...after, cancellationReason: optionalString(formData, "cancelReason") },
  });
  await refreshDailySummary(after.admissionId, after.date);
  revalidatePath("/review");
  revalidatePath("/dashboard");
  revalidatePath(`/patients/${after.admissionId}`);
  revalidatePath("/reports");
  revalidatePath("/audit");
  redirect(`/patients/${after.admissionId}?cancelada=1`);
}

export async function logReportExportAction(formData: FormData) {
  const user = await requireUser();
  assertAllowed(canViewReports(user.role));
  const admissionId = requiredString(formData, "admissionId");
  await writeAuditLog({
    userId: user.id,
    entityType: "NutritionReport",
    entityId: admissionId,
    action: "EXPORT",
    afterJson: { text: requiredString(formData, "reportText") },
  });
  revalidatePath("/audit");
}

export async function purgeExpiredImagesAction() {
  const user = await requireUser();
  assertAllowed(canManageGovernance(user.role));

  const result = await purgeExpiredLocalImages();
  await writeAuditLog({
    userId: user.id,
    entityType: "ImageAssetRetention",
    entityId: "local-storage",
    action: "DELETE",
    afterJson: {
      retentionDays: result.retentionDays,
      cutoff: result.cutoff.toISOString(),
      scanned: result.scanned,
      deletedMetadata: result.deletedMetadata,
      deletedFiles: result.deletedFiles,
      missingFiles: result.missingFiles,
      skippedUnsafeFiles: result.skippedUnsafeFiles,
      clearedMealReferences: result.clearedMealReferences,
    },
  });
  revalidatePath("/governance");
  revalidatePath("/audit");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  redirect("/governance?retencao=limpa");
}

export async function createPatientAdmissionAction(formData: FormData) {
  const user = await requireUser();
  assertAllowed(canManagePatients(user.role));

  const selectedPatientId = optionalString(formData, "patientId");
  const internalCode = optionalString(formData, "internalCode");
  const bedId = requiredString(formData, "bedId");
  const admissionDate = dateField(formData, "admissionDate");
  const transplantType = (optionalString(formData, "transplantType") ?? "NAO_INFORMADO") as import("@/generated/prisma/enums").TransplantType;
  const transplantDay = optionalString(formData, "transplantDay");
  const clinicalNotes = optionalString(formData, "clinicalNotes");

  const bed = await db.bed.findUnique({ where: { id: bedId } });
  if (!bed?.active) throw new Error("Leito inativo ou inexistente.");

  const conflictingAdmission = await db.admission.findFirst({ where: { bedId, active: true } });
  if (conflictingAdmission) throw new Error("Leito ja ocupado por admissao ativa.");

  const patient = selectedPatientId
    ? await db.patient.findUnique({ where: { id: selectedPatientId }, include: { admissions: { where: { active: true }, take: 1 } } })
    : null;

  if (selectedPatientId && !patient) throw new Error("Paciente inativo nao encontrado.");
  if (patient?.admissions.length) throw new Error("Paciente ja possui admissao ativa.");
  const newPatientInternalCode = patient ? null : internalCode ?? requiredString(formData, "internalCode");
  if (newPatientInternalCode) {
    const duplicatedPatient = await db.patient.findUnique({ where: { internalCode: newPatientInternalCode } });
    if (duplicatedPatient) throw new Error("Ja existe paciente com este codigo interno. Se estiver inativo, selecione-o na lista.");
  }

  const admittedPatient = patient
    ? await db.patient.update({ where: { id: patient.id }, data: { active: true } })
    : await db.patient.create({
        data: {
          internalCode: newPatientInternalCode!,
          active: true,
        },
      });

  const admission = await db.admission.create({
    data: { patientId: admittedPatient.id, bedId, admissionDate, transplantType, transplantDay, clinicalNotes, active: true },
  });

  if (patient && !patient.active) {
    await writeAuditLog({
      userId: user.id,
      entityType: "Patient",
      entityId: patient.id,
      action: "UPDATE",
      beforeJson: { active: patient.active },
      afterJson: { active: true, reason: "READMISSION" },
    });
  }

  await writeAuditLog({
    userId: user.id,
    entityType: "Admission",
    entityId: admission.id,
    action: "CREATE",
    afterJson: {
      patient: { internalCode: admittedPatient.internalCode, reusedInactivePatient: Boolean(patient) },
      admission: { bedId, bedName: bed.name, admissionDate, transplantType, transplantDay },
    },
  });

  revalidatePath("/patients");
  revalidatePath("/dashboard");
  redirect(`/patients/${admission.id}?admissao=salva`);
}

export async function dischargeAdmissionAction(formData: FormData) {
  const user = await requireUser();
  assertAllowed(canManagePatients(user.role));

  const admissionId = requiredString(formData, "admissionId");
  const before = await db.admission.findUniqueOrThrow({ where: { id: admissionId }, include: { bed: true, patient: true } });
  if (!before.active) throw new Error("Esta admissao ja esta inativa.");
  const dischargeDate = dateField(formData, "dischargeDate");

  const after = await db.admission.update({
    where: { id: admissionId },
    data: { active: false, dischargeDate },
  });
  const remainingActiveAdmissions = await db.admission.count({
    where: { patientId: before.patientId, active: true, id: { not: admissionId } },
  });

  if (remainingActiveAdmissions === 0 && before.patient.active) {
    await db.patient.update({ where: { id: before.patientId }, data: { active: false } });
    await writeAuditLog({
      userId: user.id,
      entityType: "Patient",
      entityId: before.patientId,
      action: "UPDATE",
      beforeJson: { active: true },
      afterJson: { active: false, reason: "DISCHARGE_WITHOUT_ACTIVE_ADMISSION" },
    });
  }

  await writeAuditLog({
    userId: user.id,
    entityType: "Admission",
    entityId: admissionId,
    action: "UPDATE",
    beforeJson: { active: before.active, dischargeDate: before.dischargeDate, bedId: before.bedId, bedName: before.bed.name },
    afterJson: {
      active: after.active,
      dischargeDate: after.dischargeDate,
      patientActive: remainingActiveAdmissions > 0,
    },
  });

  revalidatePath("/patients");
  revalidatePath("/dashboard");
  revalidatePath(`/patients/${admissionId}`);
  redirect("/patients?secao=alta&status=ativas");
}

export async function transferAdmissionBedAction(formData: FormData) {
  const user = await requireUser();
  assertAllowed(canManagePatients(user.role));

  const admissionId = requiredString(formData, "admissionId");
  const newBedId = requiredString(formData, "newBedId");
  const before = await db.admission.findUniqueOrThrow({
    where: { id: admissionId },
    include: { bed: true, patient: true },
  });

  if (!before.active) throw new Error("Apenas admissoes ativas podem trocar de leito.");
  if (before.bedId === newBedId) throw new Error("Selecione um leito diferente do atual.");

  const targetBed = await db.bed.findUnique({ where: { id: newBedId } });
  if (!targetBed?.active) throw new Error("Leito de destino inativo ou inexistente.");

  const conflictingAdmission = await db.admission.findFirst({
    where: { bedId: newBedId, active: true, id: { not: admissionId } },
    include: { patient: true },
  });
  if (conflictingAdmission) {
    throw new Error(`Leito ja ocupado por ${conflictingAdmission.patient.internalCode}.`);
  }

  const after = await db.admission.update({
    where: { id: admissionId },
    data: { bedId: newBedId },
    include: { bed: true, patient: true },
  });

  await writeAuditLog({
    userId: user.id,
    entityType: "Admission",
    entityId: admissionId,
    action: "UPDATE",
    beforeJson: {
      patientCode: before.patient.internalCode,
      bedId: before.bedId,
      bedName: before.bed.name,
    },
    afterJson: {
      patientCode: after.patient.internalCode,
      bedId: after.bedId,
      bedName: after.bed.name,
      reason: "BED_TRANSFER",
    },
  });

  revalidatePath("/patients");
  revalidatePath("/dashboard");
  revalidatePath(`/patients/${admissionId}`);
  redirect("/patients?secao=transferencia&status=ativas");
}
