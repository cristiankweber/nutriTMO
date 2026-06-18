import { unlink } from "node:fs/promises";
import { isPathInsideImageStorageDir } from "./local";

const dayInMs = 24 * 60 * 60 * 1000;

export const DEFAULT_IMAGE_RETENTION_DAYS = 30;
export const MAX_IMAGE_RETENTION_DAYS = 3650;

export type PurgeExpiredLocalImagesResult = {
  retentionDays: number;
  cutoff: Date;
  scanned: number;
  deletedMetadata: number;
  deletedFiles: number;
  missingFiles: number;
  skippedUnsafeFiles: number;
  clearedMealReferences: number;
};

export const getImageRetentionDays = () => {
  const configured = Number(process.env.IMAGE_RETENTION_DAYS);
  if (!Number.isFinite(configured) || configured < 1) return DEFAULT_IMAGE_RETENTION_DAYS;
  return Math.min(Math.trunc(configured), MAX_IMAGE_RETENTION_DAYS);
};

export const getImageRetentionCutoff = (now = new Date()) =>
  new Date(now.getTime() - getImageRetentionDays() * dayInMs);

export async function purgeExpiredLocalImages(now = new Date()): Promise<PurgeExpiredLocalImagesResult> {
  const { db } = await import("../db");
  const retentionDays = getImageRetentionDays();
  const cutoff = new Date(now.getTime() - retentionDays * dayInMs);
  const expiredImages = await db.imageAsset.findMany({
    where: { createdAt: { lt: cutoff } },
    select: { id: true, type: true, mealId: true, storagePath: true },
  });

  let clearedMealReferences = 0;
  for (const image of expiredImages) {
    const imageUrl = `/api/images/${image.id}`;
    if (image.type === "PRE_MEAL") {
      const update = await db.meal.updateMany({
        where: { id: image.mealId, preMealImageUrl: imageUrl },
        data: { preMealImageUrl: null },
      });
      clearedMealReferences += update.count;
    }
    if (image.type === "POST_MEAL") {
      const update = await db.meal.updateMany({
        where: { id: image.mealId, postMealImageUrl: imageUrl },
        data: { postMealImageUrl: null },
      });
      clearedMealReferences += update.count;
    }
  }

  let deletedFiles = 0;
  let missingFiles = 0;
  let skippedUnsafeFiles = 0;
  for (const image of expiredImages) {
    if (!isPathInsideImageStorageDir(image.storagePath)) {
      skippedUnsafeFiles += 1;
      continue;
    }

    try {
      await unlink(image.storagePath);
      deletedFiles += 1;
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        missingFiles += 1;
        continue;
      }
      throw error;
    }
  }

  const deleteResult =
    expiredImages.length > 0
      ? await db.imageAsset.deleteMany({ where: { id: { in: expiredImages.map((image) => image.id) } } })
      : { count: 0 };

  return {
    retentionDays,
    cutoff,
    scanned: expiredImages.length,
    deletedMetadata: deleteResult.count,
    deletedFiles,
    missingFiles,
    skippedUnsafeFiles,
    clearedMealReferences,
  };
}
