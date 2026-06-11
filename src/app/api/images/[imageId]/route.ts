import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ imageId: string }> }) {
  await requireUser();
  const { imageId } = await params;
  const image = await db.imageAsset.findUnique({ where: { id: imageId } });
  if (!image) return new NextResponse("Imagem nao encontrada.", { status: 404 });

  try {
    const buffer = await readFile(image.storagePath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": image.mimeType,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch {
    return new NextResponse("Arquivo local indisponivel.", { status: 404 });
  }
}
