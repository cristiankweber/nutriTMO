import type { AuditAction } from "@/generated/prisma/enums";
import { db } from "@/lib/db";

type AuditInput = {
  userId?: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  beforeJson?: unknown;
  afterJson?: unknown;
  ipAddress?: string;
};

export const writeAuditLog = async (input: AuditInput) => {
  await db.auditLog.create({
    data: {
      userId: input.userId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      beforeJson: input.beforeJson === undefined ? undefined : JSON.parse(JSON.stringify(input.beforeJson)),
      afterJson: input.afterJson === undefined ? undefined : JSON.parse(JSON.stringify(input.afterJson)),
      ipAddress: input.ipAddress,
    },
  });
};
