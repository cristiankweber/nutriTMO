import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import {
  AlertLevel,
  Confidence,
  ConsumedPercent,
  FoodCategory,
  ImageAssetType,
  ImageQuality,
  MealStatus,
  MealType,
  PrismaClient,
  Role,
  TransplantType,
} from "../src/generated/prisma/client";
import {
  buildDailySummary,
  calculateMealItemNutrition,
  consumedPercentToValue,
} from "../src/lib/clinical/calculations";
import { addDays, startOfLocalDay } from "../src/lib/dates";
import { getImageStorageDir } from "../src/lib/storage/local";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const passwordHash = async () => bcrypt.hash("nutritmo123", 10);

const demoPhotoSvg = (title: string, subtitle: string, plateColor: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
  <rect width="640" height="480" fill="#f5f5f4"/>
  <circle cx="320" cy="240" r="150" fill="#ffffff" stroke="#d6d3d1" stroke-width="6"/>
  <circle cx="320" cy="240" r="110" fill="${plateColor}"/>
  <text x="320" y="60" text-anchor="middle" font-family="sans-serif" font-size="28" fill="#44403c">${title}</text>
  <text x="320" y="440" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#78716c">${subtitle}</text>
</svg>
`;

const seedDemoPhotos = async () => {
  const storageDir = getImageStorageDir();
  await mkdir(storageDir, { recursive: true });
  const photos = [
    { filename: "seed-pre-refeicao-demo.svg", content: demoPhotoSvg("Foto pre-refeicao (demo)", "Imagem ficticia gerada pelo seed", "#a3b18a") },
    { filename: "seed-pos-refeicao-demo.svg", content: demoPhotoSvg("Foto pos-refeicao (demo)", "Imagem ficticia gerada pelo seed", "#e7e5e4") },
  ];
  const stored = [];
  for (const photo of photos) {
    const storagePath = path.join(storageDir, photo.filename);
    await writeFile(storagePath, photo.content, "utf8");
    stored.push({ storagePath, sizeBytes: Buffer.byteLength(photo.content) });
  }
  return { pre: stored[0], post: stored[1] };
};

const createMealItem = (
  foodItem: {
    id: string;
    kcalPerPortion: number;
    proteinPerPortion: number;
    carbsPerPortion: number | null;
    fatPerPortion: number | null;
  },
  multiplier: number,
  percent: ConsumedPercent,
) => {
  const nutrition = calculateMealItemNutrition({
    kcalPerPortion: foodItem.kcalPerPortion,
    proteinPerPortion: foodItem.proteinPerPortion,
    carbsPerPortion: foodItem.carbsPerPortion,
    fatPerPortion: foodItem.fatPerPortion,
    servedPortionMultiplier: multiplier,
    consumedPercent: consumedPercentToValue[percent],
  });

  return {
    foodItemId: foodItem.id,
    servedPortionMultiplier: multiplier,
    consumedPercent: percent,
    manuallyReviewed: false,
    ...nutrition,
  };
};

const main = async () => {
  await prisma.auditLog.deleteMany();
  await prisma.nutritionDailySummary.deleteMany();
  await prisma.imageAsset.deleteMany();
  await prisma.mealItem.deleteMany();
  await prisma.meal.deleteMany();
  await prisma.nutritionPrescription.deleteMany();
  await prisma.admission.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.bed.deleteMany();
  await prisma.foodItem.deleteMany();
  await prisma.user.deleteMany();

  const hash = await passwordHash();
  const [admin, nutricao, enfermagem, medico, auditor] = await Promise.all([
    prisma.user.create({ data: { name: "Admin NutriTMO", email: "admin@nutritmo.local", passwordHash: hash, role: Role.ADMIN } }),
    prisma.user.create({ data: { name: "Nutricionista Demo", email: "nutricao@nutritmo.local", passwordHash: hash, role: Role.NUTRICAO } }),
    prisma.user.create({ data: { name: "Enfermagem Demo", email: "enfermagem@nutritmo.local", passwordHash: hash, role: Role.ENFERMAGEM } }),
    prisma.user.create({ data: { name: "Medico Demo", email: "medico@nutritmo.local", passwordHash: hash, role: Role.MEDICO } }),
    prisma.user.create({ data: { name: "Auditoria Demo", email: "auditor@nutritmo.local", passwordHash: hash, role: Role.AUDITOR } }),
  ]);

  const beds = await Promise.all(
    Array.from({ length: 10 }, (_, index) =>
      prisma.bed.create({
        data: {
          name: `TMO-${String(index + 1).padStart(2, "0")}`,
          unit: "Unidade TMO",
          active: true,
        },
      }),
    ),
  );

  const foods = await Promise.all([
    ["Arroz", FoodCategory.CARBOIDRATO, 100, 130, 2.5, 28, 0.3],
    ["Feijao", FoodCategory.LEGUMINOSA, 100, 95, 6, 17, 0.5],
    ["Frango grelhado", FoodCategory.PROTEINA, 100, 165, 31, 0, 3.6],
    ["Carne moida", FoodCategory.PROTEINA, 100, 220, 26, 0, 12],
    ["Pure", FoodCategory.CARBOIDRATO, 120, 110, 2, 20, 3],
    ["Legumes cozidos", FoodCategory.VEGETAL, 100, 60, 2, 10, 1],
    ["Sopa", FoodCategory.OUTRO, 250, 180, 9, 25, 4],
    ["Fruta", FoodCategory.FRUTA, 80, 55, 0.5, 14, 0.2],
    ["Suplemento oral hipercalorico", FoodCategory.SUPLEMENTO, 200, 300, 12, 42, 10],
    ["Bebida lactea", FoodCategory.BEBIDA, 180, 160, 8, 25, 3],
    ["Cafe da manha demo", FoodCategory.OUTRO, 250, 257, 7, 31, 11],
    ["Almoco demo", FoodCategory.OUTRO, 350, 340, 19, 44, 6],
    ["Lanche demo", FoodCategory.OUTRO, 400, 700, 10, 98, 30],
    ["Janta demo", FoodCategory.OUTRO, 300, 210, 4, 46, 2],
  ].map(([name, category, grams, kcal, protein, carbs, fat]) =>
    prisma.foodItem.create({
      data: {
        name: String(name),
        category: category as FoodCategory,
        standardPortionGrams: Number(grams),
        kcalPerPortion: Number(kcal),
        proteinPerPortion: Number(protein),
        carbsPerPortion: Number(carbs),
        fatPerPortion: Number(fat),
        active: true,
      },
    }),
  ));

  const demoPhotos = await seedDemoPhotos();
  const today = startOfLocalDay();
  const patients = await Promise.all(
    Array.from({ length: 5 }, (_, index) =>
      prisma.patient.create({
        data: {
          internalCode: `PSEUDO-TMO-${String(index + 1).padStart(3, "0")}`,
          displayName: `Paciente demo ${index + 1}`,
          active: true,
        },
      }),
    ),
  );

  const admissions = await Promise.all(
    patients.map((patient, index) =>
      prisma.admission.create({
        data: {
          patientId: patient.id,
          bedId: beds[index].id,
          admissionDate: addDays(today, -12 + index),
          transplantType: [TransplantType.ALOGENICO, TransplantType.AUTOLOGO, TransplantType.HAPLOIDENTICO][index % 3],
          transplantDay: index === 0 ? "D+5" : index === 1 ? "D-2" : `D+${index + 1}`,
          clinicalNotes: index === 2 ? "Observacao ficticia: alto risco nutricional para demonstracao." : null,
          active: true,
        },
      }),
    ),
  );

  const prescriptions = await Promise.all(
    admissions.slice(0, 3).map((admission, index) =>
      prisma.nutritionPrescription.create({
        data: {
          admissionId: admission.id,
          date: today,
          dietType: index === 1 ? "Dieta branda" : "Dieta oral hospitalar",
          consistency: index === 2 ? "Pastosa" : "Normal",
          restrictions: index === 0 ? "Neutropenia: alimentos higienizados conforme rotina." : null,
          kcalTarget: [1800, 1650, 1900][index],
          proteinTarget: [80, 70, 90][index],
          supplementsPlan: index === 0 ? "Suplemento oral hipercalorico 2x/dia" : "Conforme aceitacao",
          createdById: nutricao.id,
          reviewedById: admin.id,
        },
      }),
    ),
  );

  for (const [index, admission] of admissions.entries()) {
    const createdMeals =
      index === 0
        ? await Promise.all([
            prisma.meal.create({
              data: {
                admissionId: admission.id,
                date: today,
                mealType: MealType.CAFE_MANHA,
                status: MealStatus.FINALIZADA,
                imageQuality: ImageQuality.ADEQUADA,
                confidence: Confidence.ALTA,
                notes: "Registro demo compativel com relatorio por refeicao.",
                createdById: nutricao.id,
                items: { create: [createMealItem(foods[10], 1, ConsumedPercent.ONE_HUNDRED)] },
              },
              include: { items: true },
            }),
            prisma.meal.create({
              data: {
                admissionId: admission.id,
                date: today,
                mealType: MealType.ALMOCO,
                status: MealStatus.FINALIZADA,
                imageQuality: ImageQuality.ADEQUADA,
                confidence: Confidence.ALTA,
                notes: "Registro demo compativel com relatorio por refeicao.",
                createdById: nutricao.id,
                items: { create: [createMealItem(foods[11], 1, ConsumedPercent.ONE_HUNDRED)] },
              },
              include: { items: true },
            }),
            prisma.meal.create({
              data: {
                admissionId: admission.id,
                date: today,
                mealType: MealType.LANCHE_TARDE,
                status: MealStatus.FINALIZADA,
                imageQuality: ImageQuality.ADEQUADA,
                confidence: Confidence.ALTA,
                notes: "Registro demo compativel com relatorio por refeicao.",
                createdById: nutricao.id,
                items: { create: [createMealItem(foods[12], 1, ConsumedPercent.ONE_HUNDRED)] },
              },
              include: { items: true },
            }),
            prisma.meal.create({
              data: {
                admissionId: admission.id,
                date: today,
                mealType: MealType.JANTAR,
                status: MealStatus.REVISADA,
                imageQuality: ImageQuality.ADEQUADA,
                confidence: Confidence.ALTA,
                notes: "Registro revisado demo para menor ingesta.",
                createdById: nutricao.id,
                reviewedById: nutricao.id,
                items: { create: [{ ...createMealItem(foods[13], 1, ConsumedPercent.ONE_HUNDRED), manuallyReviewed: true }] },
              },
              include: { items: true },
            }),
          ])
        : await Promise.all([
            prisma.meal.create({
              data: {
                admissionId: admission.id,
                date: today,
                mealType: MealType.ALMOCO,
                status: index === 2 ? MealStatus.PARCIALMENTE_REGISTRADA : MealStatus.FINALIZADA,
                imageQuality: index === 2 ? ImageQuality.INADEQUADA : ImageQuality.ADEQUADA,
                confidence: index === 2 ? Confidence.BAIXA : Confidence.ALTA,
                notes: index === 2 ? "Foto pos-refeicao inadequada para demonstrar revisao." : "Registro demo.",
                createdById: index === 4 ? enfermagem.id : nutricao.id,
                items: {
                  create: [
                    createMealItem(foods[0], 1, index === 1 ? ConsumedPercent.FIFTY : ConsumedPercent.SEVENTY_FIVE),
                    createMealItem(foods[1], 1, index === 1 ? ConsumedPercent.TWENTY_FIVE : ConsumedPercent.FIFTY),
                    createMealItem(foods[2], 1, index === 2 ? ConsumedPercent.TWENTY_FIVE : ConsumedPercent.SEVENTY_FIVE),
                    createMealItem(foods[5], 1, ConsumedPercent.FIFTY),
                  ],
                },
              },
              include: { items: true },
            }),
            prisma.meal.create({
              data: {
                admissionId: admission.id,
                date: today,
                mealType: MealType.SUPLEMENTO,
                status: MealStatus.FINALIZADA,
                imageQuality: ImageQuality.NAO_AVALIADA,
                confidence: Confidence.NAO_APLICAVEL,
                notes: "Suplemento oral demo.",
                createdById: nutricao.id,
                items: {
                  create: [createMealItem(foods[8], 1, index === 3 ? ConsumedPercent.ZERO : ConsumedPercent.ONE_HUNDRED)],
                },
              },
              include: { items: true },
            }),
          ]);

    const [preImage, postImage] = await Promise.all([
      prisma.imageAsset.create({
        data: {
          mealId: createdMeals[0].id,
          type: ImageAssetType.PRE_MEAL,
          storagePath: demoPhotos.pre.storagePath,
          originalFilename: "seed-pre-refeicao-demo.svg",
          mimeType: "image/svg+xml",
          sizeBytes: demoPhotos.pre.sizeBytes,
          uploadedById: nutricao.id,
          containsPotentialIdentifier: false,
          notes: "Imagem ficticia gerada pelo seed para demonstracao.",
        },
      }),
      prisma.imageAsset.create({
        data: {
          mealId: createdMeals[0].id,
          type: ImageAssetType.POST_MEAL,
          storagePath: demoPhotos.post.storagePath,
          originalFilename: "seed-pos-refeicao-demo.svg",
          mimeType: "image/svg+xml",
          sizeBytes: demoPhotos.post.sizeBytes,
          uploadedById: nutricao.id,
          containsPotentialIdentifier: false,
          notes: "Imagem ficticia gerada pelo seed para demonstracao.",
        },
      }),
    ]);
    await prisma.meal.update({
      where: { id: createdMeals[0].id },
      data: {
        preMealImageUrl: `/api/images/${preImage.id}`,
        postMealImageUrl: `/api/images/${postImage.id}`,
      },
    });

    const prescription = prescriptions[Math.min(index, prescriptions.length - 1)];
    const mealItems = createdMeals.flatMap((meal) => meal.items);
    const summary = buildDailySummary({
      admissionId: admission.id,
      date: today,
      items: mealItems,
      kcalTarget: prescription.kcalTarget,
      proteinTarget: prescription.proteinTarget,
      missingCriticalMealsCount: index >= 3 ? 1 : 0,
      hasInadequatePhotoWithoutReview: index === 2,
      previousDayHadLowIntake: index === 3,
      hasHighRiskClinicalNote: index === 2,
    });

    await prisma.nutritionDailySummary.create({
      data: {
        ...summary,
        alertLevel: summary.alertLevel as AlertLevel,
      },
    });
  }

  await prisma.auditLog.createMany({
    data: [
      {
        userId: admin.id,
        entityType: "Seed",
        entityId: "demo",
        action: "CREATE",
        afterJson: { users: 5, beds: 10, foods: 14, activeAdmissions: 5 },
      },
      {
        userId: medico.id,
        entityType: "Report",
        entityId: "demo",
        action: "EXPORT",
        afterJson: { note: "Exportacao ficticia para demonstracao." },
      },
      {
        userId: auditor.id,
        entityType: "Audit",
        entityId: "demo",
        action: "LOGIN",
        afterJson: { note: "Login ficticio no seed." },
      },
    ],
  });

  console.log("Seed NutriTMO concluido. Senha dos usuarios demo: nutritmo123");
};

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
