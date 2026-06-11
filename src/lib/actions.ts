"use server";

import bcrypt from "bcryptjs";
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
  canManageMenu,
  canManagePatients,
  canManagePrescriptions,
  canRegisterMeals,
  canReviewMeals,
} from "@/lib/auth/permissions";
import { clearSessionCookie, requireUser, setSessionCookie } from "@/lib/auth/session";
import {
  buildDailySummary,
  calculateConsumedCarbs,
  calculateConsumedFat,
  calculateConsumedKcal,
  calculateConsumedProtein,
  calculateMealItemNutrition,
  consumedPercentToValue,
} from "@/lib/clinical/calculations";
import { addDays, startOfLocalDay } from "@/lib/dates";
import { db } from "@/lib/db";
import { buildReviewMetadata } from "@/lib/review/rules";
import { storeLocalImage } from "@/lib/storage/local";

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

const dayRange = (date: Date) => {
  const start = startOfLocalDay(date);
  return { start, end: addDays(start, 1) };
};

const criticalMealTypes: MealType[] = ["CAFE_MANHA", "ALMOCO", "JANTAR"];

export async function refreshDailySummary(admissionId: string, date: Date) {
  const { start, end } = dayRange(date);
  const [admission, prescription, meals, previousSummary] = await Promise.all([
    db.admission.findUnique({ where: { id: admissionId } }),
    db.nutritionPrescription.findFirst({
      where: { admissionId, date: { lte: end } },
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

export async function loginAction(formData: FormData) {
  const email = requiredString(formData, "email").toLowerCase();
  const password = requiredString(formData, "password");
  const user = await db.user.findUnique({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    redirect("/login?erro=credenciais");
  }

  await setSessionCookie({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
  await writeAuditLog({
    userId: user.id,
    entityType: "User",
    entityId: user.id,
    action: "LOGIN",
    afterJson: { email: user.email, role: user.role },
  });
  redirect("/dashboard");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
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

  const prescription = await db.nutritionPrescription.create({
    data: {
      admissionId: requiredString(formData, "admissionId"),
      date: dateField(formData, "date"),
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
  await refreshDailySummary(prescription.admissionId, prescription.date);
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
  await refreshDailySummary(after.admissionId, after.date);
  if (before.date.getTime() !== after.date.getTime()) {
    await refreshDailySummary(before.admissionId, before.date);
  }
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
  const foodItemIds = formData.getAll("foodItemId").filter((value): value is string => typeof value === "string" && value !== "");
  const multipliers = formData.getAll("servedPortionMultiplier");
  const percents = formData.getAll("consumedPercent");
  const itemNotes = formData.getAll("itemNotes");

  if (foodItemIds.length === 0) throw new Error("Adicione ao menos um item servido.");

  const foods = await db.foodItem.findMany({ where: { id: { in: foodItemIds } } });
  const foodById = new Map(foods.map((food) => [food.id, food]));
  const mealItems = foodItemIds.map((foodItemId, index) => {
    const food = foodById.get(foodItemId);
    if (!food) throw new Error("Item da base alimentar nao encontrado.");
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

export async function createPatientAdmissionAction(formData: FormData) {
  const user = await requireUser();
  assertAllowed(canManagePatients(user.role));

  const internalCode = requiredString(formData, "internalCode");
  const bedId = requiredString(formData, "bedId");
  const admissionDate = dateField(formData, "admissionDate");
  const transplantType = (optionalString(formData, "transplantType") ?? "NAO_INFORMADO") as import("@/generated/prisma/enums").TransplantType;
  const transplantDay = optionalString(formData, "transplantDay");
  const clinicalNotes = optionalString(formData, "clinicalNotes");

  const existing = await db.patient.findUnique({ where: { internalCode } });
  if (existing) throw new Error("Ja existe paciente com este codigo interno.");

  const conflictingAdmission = await db.admission.findFirst({ where: { bedId, active: true } });
  if (conflictingAdmission) throw new Error("Leito ja ocupado por admissao ativa.");

  const patient = await db.patient.create({ data: { internalCode } });
  const admission = await db.admission.create({
    data: { patientId: patient.id, bedId, admissionDate, transplantType, transplantDay, clinicalNotes, active: true },
  });

  await writeAuditLog({
    userId: user.id,
    entityType: "Admission",
    entityId: admission.id,
    action: "CREATE",
    afterJson: { patient: { internalCode }, admission: { bedId, admissionDate, transplantType, transplantDay } },
  });

  revalidatePath("/patients");
  revalidatePath("/dashboard");
  redirect(`/patients/${admission.id}?admissao=salva`);
}

export async function dischargeAdmissionAction(formData: FormData) {
  const user = await requireUser();
  assertAllowed(canManagePatients(user.role));

  const admissionId = requiredString(formData, "admissionId");
  const before = await db.admission.findUniqueOrThrow({ where: { id: admissionId } });
  const dischargeDate = dateField(formData, "dischargeDate");

  const after = await db.admission.update({
    where: { id: admissionId },
    data: { active: false, dischargeDate },
  });

  await writeAuditLog({
    userId: user.id,
    entityType: "Admission",
    entityId: admissionId,
    action: "UPDATE",
    beforeJson: { active: before.active, dischargeDate: before.dischargeDate },
    afterJson: { active: after.active, dischargeDate: after.dischargeDate },
  });

  revalidatePath("/patients");
  revalidatePath("/dashboard");
  redirect("/patients?secao=alta");
}
