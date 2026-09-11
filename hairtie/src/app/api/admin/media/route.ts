import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminOrNull } from "@/lib/auth";
import { storeUpload } from "@/lib/storage";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(request: Request) {
  if (!(await getAdminOrNull())) return NextResponse.json({ message: "Not authorised." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const folder = searchParams.get("folder")?.trim();
  const take = Math.min(Number(searchParams.get("take") ?? 60), 200);
  const skip = Math.max(Number(searchParams.get("skip") ?? 0), 0);

  const where: Prisma.MediaAssetWhereInput = {};
  if (q) {
    where.OR = [
      { filename: { contains: q, mode: "insensitive" } },
      { alt: { contains: q, mode: "insensitive" } },
      { folder: { contains: q, mode: "insensitive" } },
    ];
  }
  if (folder) where.folder = folder;

  const [assets, total, folders] = await Promise.all([
    prisma.mediaAsset.findMany({ where, orderBy: { createdAt: "desc" }, take, skip }),
    prisma.mediaAsset.count({ where }),
    prisma.mediaAsset.findMany({ distinct: ["folder"], select: { folder: true }, orderBy: { folder: "asc" } }),
  ]);

  return NextResponse.json({
    assets,
    total,
    folders: folders.map((row) => row.folder),
  });
}

export async function POST(request: Request) {
  if (!(await getAdminOrNull())) return NextResponse.json({ message: "Not authorised." }, { status: 401 });

  const form = await request.formData();
  const files = form.getAll("files").filter((entry): entry is File => entry instanceof File);
  const folder = String(form.get("folder") ?? "Uploads") || "Uploads";

  if (files.length === 0) return NextResponse.json({ message: "No files were sent." }, { status: 400 });
  if (files.length > 20) return NextResponse.json({ message: "Please upload up to 20 images at a time." }, { status: 400 });

  const created = [];
  const failed: string[] = [];

  for (const file of files) {
    try {
      const stored = await storeUpload(file);
      const asset = await prisma.mediaAsset.create({
        data: {
          url: stored.url,
          filename: stored.filename,
          mimeType: stored.mimeType,
          width: stored.width || null,
          height: stored.height || null,
          sizeBytes: stored.sizeBytes,
          folder,
          alt: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").slice(0, 120),
        },
      });
      created.push(asset);
    } catch (error) {
      failed.push(`${file.name}: ${error instanceof Error ? error.message : "upload failed"}`);
    }
  }

  if (created.length === 0) {
    return NextResponse.json({ message: failed.join("; ") || "Upload failed." }, { status: 400 });
  }

  return NextResponse.json({
    assets: created,
    message:
      failed.length > 0
        ? `${created.length} uploaded. Some files were skipped — ${failed.join("; ")}`
        : `${created.length} ${created.length === 1 ? "image" : "images"} uploaded.`,
  });
}

export async function DELETE(request: Request) {
  if (!(await getAdminOrNull())) return NextResponse.json({ message: "Not authorised." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ message: "Missing id." }, { status: 400 });

  // Only the library record is removed. The file itself is left in place so an
  // image still referenced by an old order or a published page does not break.
  await prisma.mediaAsset.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ ok: true, message: "Removed from the library." });
}

export async function PATCH(request: Request) {
  if (!(await getAdminOrNull())) return NextResponse.json({ message: "Not authorised." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ message: "Missing id." }, { status: 400 });

  await prisma.mediaAsset.update({
    where: { id: String(body.id) },
    data: {
      alt: typeof body.alt === "string" ? body.alt.slice(0, 200) : undefined,
      folder: typeof body.folder === "string" && body.folder ? body.folder.slice(0, 60) : undefined,
    },
  });
  return NextResponse.json({ ok: true, message: "Saved." });
}
