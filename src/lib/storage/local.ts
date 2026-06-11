import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export type StoredImage = {
  storagePath: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
};

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

const extensionForMime = (mimeType: string) => {
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "image/heic") return ".heic";
  if (mimeType === "image/heif") return ".heif";
  return ".jpg";
};

const safeOriginalFilename = (mimeType: string) => `imagem-refeicao-upload${extensionForMime(mimeType)}`;

export const getImageStorageDir = () => {
  const configured = process.env.IMAGE_STORAGE_DIR;
  if (configured && path.isAbsolute(configured)) return configured;
  return path.join(/* turbopackIgnore: true */ process.cwd(), configured ?? "storage/images");
};

export const storeLocalImage = async (file: File): Promise<StoredImage | null> => {
  if (!file || file.size === 0) return null;
  if (!allowedMimeTypes.has(file.type)) {
    throw new Error("Formato de imagem nao permitido.");
  }

  const storageDir = getImageStorageDir();
  await mkdir(storageDir, { recursive: true });
  const filename = `${crypto.randomUUID()}${extensionForMime(file.type)}`;
  const storagePath = path.join(storageDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(storagePath, buffer);

  return {
    storagePath,
    originalFilename: safeOriginalFilename(file.type),
    mimeType: file.type,
    sizeBytes: file.size,
  };
};
