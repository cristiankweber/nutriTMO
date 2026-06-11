-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'NUTRICAO', 'ENFERMAGEM', 'MEDICO', 'AUDITOR');

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('FEMININO', 'MASCULINO', 'OUTRO', 'NAO_INFORMADO');

-- CreateEnum
CREATE TYPE "TransplantType" AS ENUM ('AUTOLOGO', 'ALOGENICO', 'HAPLOIDENTICO', 'CORDONAL', 'NAO_INFORMADO');

-- CreateEnum
CREATE TYPE "FoodCategory" AS ENUM ('CARBOIDRATO', 'PROTEINA', 'LEGUMINOSA', 'VEGETAL', 'FRUTA', 'SOBREMESA', 'SUPLEMENTO', 'BEBIDA', 'OUTRO');

-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('CAFE_MANHA', 'LANCHE_MANHA', 'ALMOCO', 'LANCHE_TARDE', 'JANTAR', 'CEIA', 'SUPLEMENTO', 'OUTRO');

-- CreateEnum
CREATE TYPE "MealStatus" AS ENUM ('PLANEJADA', 'SERVIDA', 'PARCIALMENTE_REGISTRADA', 'FINALIZADA', 'REVISADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "ImageQuality" AS ENUM ('ADEQUADA', 'INADEQUADA', 'NAO_AVALIADA');

-- CreateEnum
CREATE TYPE "Confidence" AS ENUM ('ALTA', 'MEDIA', 'BAIXA', 'NAO_APLICAVEL');

-- CreateEnum
CREATE TYPE "ConsumedPercent" AS ENUM ('ZERO', 'TWENTY_FIVE', 'FIFTY', 'SEVENTY_FIVE', 'ONE_HUNDRED');

-- CreateEnum
CREATE TYPE "AlertLevel" AS ENUM ('VERDE', 'AMARELO', 'LARANJA', 'VERMELHO', 'CINZA');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'REVIEW', 'LOGIN', 'EXPORT');

-- CreateEnum
CREATE TYPE "ImageAssetType" AS ENUM ('PRE_MEAL', 'POST_MEAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "hospitalCode" TEXT,
    "internalCode" TEXT NOT NULL,
    "displayName" TEXT,
    "birthDate" TIMESTAMP(3),
    "sex" "Sex",
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bed" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Bed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admission" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "bedId" TEXT NOT NULL,
    "admissionDate" TIMESTAMP(3) NOT NULL,
    "dischargeDate" TIMESTAMP(3),
    "transplantType" "TransplantType" NOT NULL DEFAULT 'NAO_INFORMADO',
    "transplantDay" TEXT,
    "clinicalNotes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Admission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionPrescription" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "dietType" TEXT NOT NULL,
    "consistency" TEXT NOT NULL,
    "restrictions" TEXT,
    "kcalTarget" DOUBLE PRECISION NOT NULL,
    "proteinTarget" DOUBLE PRECISION NOT NULL,
    "fluidRestriction" TEXT,
    "supplementsPlan" TEXT,
    "createdById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NutritionPrescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "FoodCategory" NOT NULL,
    "standardPortionGrams" DOUBLE PRECISION NOT NULL,
    "kcalPerPortion" DOUBLE PRECISION NOT NULL,
    "proteinPerPortion" DOUBLE PRECISION NOT NULL,
    "carbsPerPortion" DOUBLE PRECISION,
    "fatPerPortion" DOUBLE PRECISION,
    "sodiumMgPerPortion" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FoodItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meal" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "mealType" "MealType" NOT NULL,
    "status" "MealStatus" NOT NULL DEFAULT 'PLANEJADA',
    "preMealImageUrl" TEXT,
    "postMealImageUrl" TEXT,
    "imageQuality" "ImageQuality" NOT NULL DEFAULT 'NAO_AVALIADA',
    "confidence" "Confidence" NOT NULL DEFAULT 'NAO_APLICAVEL',
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealItem" (
    "id" TEXT NOT NULL,
    "mealId" TEXT NOT NULL,
    "foodItemId" TEXT NOT NULL,
    "servedPortionMultiplier" DOUBLE PRECISION NOT NULL,
    "servedKcal" DOUBLE PRECISION NOT NULL,
    "servedProtein" DOUBLE PRECISION NOT NULL,
    "consumedPercent" "ConsumedPercent" NOT NULL DEFAULT 'ZERO',
    "consumedKcal" DOUBLE PRECISION NOT NULL,
    "consumedProtein" DOUBLE PRECISION NOT NULL,
    "manuallyReviewed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "MealItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionDailySummary" (
    "id" TEXT NOT NULL,
    "admissionId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalServedKcal" DOUBLE PRECISION NOT NULL,
    "totalConsumedKcal" DOUBLE PRECISION NOT NULL,
    "kcalTarget" DOUBLE PRECISION NOT NULL,
    "kcalTargetPercent" DOUBLE PRECISION NOT NULL,
    "totalServedProtein" DOUBLE PRECISION NOT NULL,
    "totalConsumedProtein" DOUBLE PRECISION NOT NULL,
    "proteinTarget" DOUBLE PRECISION NOT NULL,
    "proteinTargetPercent" DOUBLE PRECISION NOT NULL,
    "missingMealsCount" INTEGER NOT NULL,
    "alertLevel" "AlertLevel" NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NutritionDailySummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImageAsset" (
    "id" TEXT NOT NULL,
    "mealId" TEXT NOT NULL,
    "type" "ImageAssetType" NOT NULL,
    "storagePath" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "containsPotentialIdentifier" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "ImageAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_hospitalCode_key" ON "Patient"("hospitalCode");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_internalCode_key" ON "Patient"("internalCode");

-- CreateIndex
CREATE UNIQUE INDEX "Bed_name_key" ON "Bed"("name");

-- CreateIndex
CREATE INDEX "Admission_patientId_idx" ON "Admission"("patientId");

-- CreateIndex
CREATE INDEX "Admission_bedId_idx" ON "Admission"("bedId");

-- CreateIndex
CREATE INDEX "Admission_active_idx" ON "Admission"("active");

-- CreateIndex
CREATE INDEX "NutritionPrescription_admissionId_date_idx" ON "NutritionPrescription"("admissionId", "date");

-- CreateIndex
CREATE INDEX "Meal_admissionId_date_idx" ON "Meal"("admissionId", "date");

-- CreateIndex
CREATE INDEX "Meal_status_idx" ON "Meal"("status");

-- CreateIndex
CREATE INDEX "MealItem_mealId_idx" ON "MealItem"("mealId");

-- CreateIndex
CREATE INDEX "MealItem_foodItemId_idx" ON "MealItem"("foodItemId");

-- CreateIndex
CREATE INDEX "NutritionDailySummary_date_idx" ON "NutritionDailySummary"("date");

-- CreateIndex
CREATE UNIQUE INDEX "NutritionDailySummary_admissionId_date_key" ON "NutritionDailySummary"("admissionId", "date");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "ImageAsset_mealId_idx" ON "ImageAsset"("mealId");

-- CreateIndex
CREATE INDEX "ImageAsset_uploadedById_idx" ON "ImageAsset"("uploadedById");

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "Bed"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionPrescription" ADD CONSTRAINT "NutritionPrescription_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionPrescription" ADD CONSTRAINT "NutritionPrescription_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionPrescription" ADD CONSTRAINT "NutritionPrescription_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meal" ADD CONSTRAINT "Meal_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meal" ADD CONSTRAINT "Meal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meal" ADD CONSTRAINT "Meal_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealItem" ADD CONSTRAINT "MealItem_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "Meal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealItem" ADD CONSTRAINT "MealItem_foodItemId_fkey" FOREIGN KEY ("foodItemId") REFERENCES "FoodItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionDailySummary" ADD CONSTRAINT "NutritionDailySummary_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageAsset" ADD CONSTRAINT "ImageAsset_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "Meal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageAsset" ADD CONSTRAINT "ImageAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
