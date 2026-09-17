import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/**
 * Media storage.
 *
 * Two drivers ship with the platform, chosen with MEDIA_DRIVER:
 *   local     — writes into /public/uploads. Fine for a VPS or local use, but a
 *               serverless host (Vercel) has a read-only filesystem, so uploads
 *               will not persist there.
 *   supabase  — uploads to a Supabase Storage bucket. Recommended for Vercel.
 *
 * Every upload is converted to WebP and resized down to a sensible maximum, so
 * the client can upload straight from her phone without thinking about size.
 */

export type StoredFile = {
  url: string;
  filename: string;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
};

const MAX_EDGE = 2000;
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export const ALLOWED_UPLOAD_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];

export function mediaDriver() {
  const driver = process.env.MEDIA_DRIVER ?? "local";
  return driver === "supabase" ? "supabase" : "local";
}

function safeName(original: string) {
  const base = path
    .basename(original, path.extname(original))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 7);
  return `${base || "image"}-${stamp}${rand}`;
}

export async function storeUpload(file: File): Promise<StoredFile> {
  if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) {
    throw new Error(`Unsupported file type: ${file.type || "unknown"}`);
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("That image is larger than 15 MB. Please pick a smaller one.");
  }

  const input = Buffer.from(await file.arrayBuffer());

  const pipeline = sharp(input, { animated: file.type === "image/gif" });
  const meta = await pipeline.metadata();
  const resized = pipeline
    .rotate()
    .resize({
      width: Math.min(meta.width ?? MAX_EDGE, MAX_EDGE),
      height: Math.min(meta.height ?? MAX_EDGE, MAX_EDGE),
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82, effort: 4 });

  const { data, info } = await resized.toBuffer({ resolveWithObject: true });
  const filename = `${safeName(file.name)}.webp`;
  const url = await put(filename, data, "image/webp");

  return {
    url,
    filename,
    mimeType: "image/webp",
    width: info.width,
    height: info.height,
    sizeBytes: data.length,
  };
}

async function put(filename: string, data: Buffer, contentType: string): Promise<string> {
  if (mediaDriver() === "supabase") return putSupabase(filename, data, contentType);
  return putLocal(filename, data);
}

async function putLocal(filename: string, data: Buffer) {
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), data);
  return `/uploads/${filename}`;
}

async function putSupabase(filename: string, data: Buffer, contentType: string) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "hairtie-media";
  if (!url || !key) {
    throw new Error(
      "Supabase storage is selected but SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are missing.",
    );
  }
  const endpoint = `${url.replace(/\/$/, "")}/storage/v1/object/${bucket}/${filename}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": contentType,
      "cache-control": "public, max-age=31536000, immutable",
    },
    body: new Uint8Array(data),
  });
  if (!response.ok) {
    throw new Error(`Supabase upload failed (${response.status}): ${await response.text()}`);
  }
  return `${url.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${filename}`;
}
