import "server-only";
import { createId, matches, mutate, newestFirst, now, store } from "@/lib/store";
import type { MediaAsset } from "@/lib/types";

export function listMedia(options: { q?: string; folder?: string } = {}) {
  let assets = [...store().media];
  if (options.folder) assets = assets.filter((asset) => asset.folder === options.folder);
  if (options.q) {
    const q = options.q;
    assets = assets.filter(
      (asset) => matches(asset.filename, q) || matches(asset.alt, q) || matches(asset.folder, q),
    );
  }
  return assets.sort(newestFirst);
}

export function mediaFolders() {
  return [...new Set(store().media.map((asset) => asset.folder))].sort();
}

export function addMedia(asset: Omit<MediaAsset, "id" | "createdAt">) {
  return mutate((data) => {
    const created: MediaAsset = { ...asset, id: createId("med"), createdAt: now() };
    data.media.unshift(created);
    return created;
  });
}

export function removeMedia(id: string) {
  mutate((data) => {
    data.media = data.media.filter((asset) => asset.id !== id);
  });
}

export function updateMedia(id: string, patch: Partial<Pick<MediaAsset, "alt" | "folder">>) {
  mutate((data) => {
    const asset = data.media.find((entry) => entry.id === id);
    if (!asset) return;
    if (patch.alt !== undefined) asset.alt = patch.alt.slice(0, 200);
    if (patch.folder) asset.folder = patch.folder.slice(0, 60);
  });
}
