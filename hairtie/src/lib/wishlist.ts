import "server-only";
import { cookies } from "next/headers";

/**
 * The wishlist lives in a cookie rather than an account, so a visitor can save
 * favourites without signing in. It holds product ids only.
 */

export const WISHLIST_COOKIE = "hairtie_wishlist";
const MAX_ITEMS = 100;

function parse(value: string | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export async function getWishlistIds(): Promise<string[]> {
  const jar = await cookies();
  return parse(jar.get(WISHLIST_COOKIE)?.value);
}

/** Only callable from a Server Action or Route Handler — it writes a cookie. */
export async function setWishlistIds(ids: string[]) {
  const jar = await cookies();
  jar.set(WISHLIST_COOKIE, JSON.stringify(ids.slice(0, MAX_ITEMS)), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
