import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL nao configurada.");
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const requireExact = (label: string, actual: number, expected: number) => {
  if (actual !== expected) throw new Error(`${label}: esperado ${expected}, encontrado ${actual}.`);
};

const requireAtLeast = (label: string, actual: number, minimum: number) => {
  if (actual < minimum) throw new Error(`${label}: esperado pelo menos ${minimum}, encontrado ${actual}.`);
};

const main = async () => {
  const [
    users,
    activeBeds,
    foodItems,
    totalPatients,
    activePatients,
    inactivePatients,
    activeAdmissions,
    dischargedAdmissions,
    prescriptions,
    meals,
    canceledMeals,
    reviewCandidates,
    dailySummaries,
    imageAssets,
    reviewAuditLogs,
    exportAuditLogs,
    seedAuditLogs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.bed.count({ where: { active: true } }),
    prisma.foodItem.count({ where: { active: true } }),
    prisma.patient.count(),
    prisma.patient.count({ where: { active: true } }),
    prisma.patient.count({ where: { active: false } }),
    prisma.admission.count({ where: { active: true } }),
    prisma.admission.count({ where: { active: false, dischargeDate: { not: null } } }),
    prisma.nutritionPrescription.count(),
    prisma.meal.count(),
    prisma.meal.count({ where: { status: "CANCELADA" } }),
    prisma.meal.count({
      where: {
        status: { not: "CANCELADA" },
        OR: [{ imageQuality: "INADEQUADA" }, { confidence: "BAIXA" }, { status: "PARCIALMENTE_REGISTRADA" }],
      },
    }),
    prisma.nutritionDailySummary.count(),
    prisma.imageAsset.count(),
    prisma.auditLog.count({ where: { action: "REVIEW" } }),
    prisma.auditLog.count({ where: { action: "EXPORT" } }),
    prisma.auditLog.count({ where: { entityType: "Seed", entityId: "demo", action: "CREATE" } }),
  ]);

  const occupiedBeds = await prisma.admission.findMany({
    where: { active: true },
    select: { bedId: true },
    distinct: ["bedId"],
  });
  const freeBeds = activeBeds - occupiedBeds.length;

  requireExact("usuarios demo", users, 5);
  requireExact("leitos ativos", activeBeds, 10);
  requireExact("itens ativos da base alimentar", foodItems, 14);
  requireExact("pacientes totais", totalPatients, 6);
  requireExact("pacientes ativos", activePatients, 5);
  requireExact("pacientes inativos", inactivePatients, 1);
  requireExact("admissoes ativas", activeAdmissions, 5);
  requireExact("altas historicas", dischargedAdmissions, 1);
  requireExact("leitos livres", freeBeds, 5);
  requireAtLeast("prescricoes", prescriptions, 3);
  requireAtLeast("refeicoes", meals, 10);
  requireAtLeast("refeicoes canceladas", canceledMeals, 1);
  requireAtLeast("pendencias de revisao", reviewCandidates, 1);
  requireExact("resumos diarios", dailySummaries, 5);
  requireAtLeast("imagens demo locais", imageAssets, 10);
  requireAtLeast("auditorias de revisao", reviewAuditLogs, 1);
  requireAtLeast("auditorias de exportacao", exportAuditLogs, 1);
  requireAtLeast("auditorias de seed", seedAuditLogs, 1);

  console.table({
    users,
    activeBeds,
    freeBeds,
    foodItems,
    totalPatients,
    activePatients,
    inactivePatients,
    activeAdmissions,
    dischargedAdmissions,
    prescriptions,
    meals,
    canceledMeals,
    reviewCandidates,
    dailySummaries,
    imageAssets,
    reviewAuditLogs,
    exportAuditLogs,
  });
  console.log("Seed demo verificado para piloto local.");
};

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
