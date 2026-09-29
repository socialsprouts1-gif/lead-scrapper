import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";

/**
 * One shared password for the shop manager.
 *
 * Set ADMIN_PASSWORD and /admin asks for it once per device. Leave it unset and
 * the admin stays open, which is what you want on your own machine and what the
 * shop shipped with — but never on a public address.
 *
 * The cookie holds an HMAC of a fixed phrase keyed by the password, so the
 * password itself is never stored in the browser, and changing the password
 * invalidates every cookie already issued.
 */

const COOKIE = "hairtie_admin";
const MAX_AGE = 60 * 60 * 24 * 14;

export function adminPasswordRequired() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

function sessionToken() {
  return crypto
    .createHmac("sha256", process.env.ADMIN_PASSWORD ?? "")
    .update("hairtie-admin-session-v1")
    .digest("hex");
}

/** Constant-time compare that tolerates different lengths. */
function sameSecret(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export async function isAdminSignedIn() {
  if (!adminPasswordRequired()) return true;
  const value = (await cookies()).get(COOKIE)?.value;
  return Boolean(value) && sameSecret(value!, sessionToken());
}

/**
 * A failed attempt costs a second, and six wrong guesses from one instance
 * close the door for a while. This is per server instance, not global — enough
 * to make guessing tedious, and no substitute for a long password.
 */
const attempts = new Map<string, { count: number; until: number }>();
const LOCKOUT_MS = 5 * 60 * 1000;

export function attemptsExhausted(key = "shared") {
  const entry = attempts.get(key);
  return Boolean(entry && entry.count >= 6 && Date.now() < entry.until);
}

function recordFailure(key = "shared") {
  const entry = attempts.get(key) ?? { count: 0, until: 0 };
  entry.count += 1;
  entry.until = Date.now() + LOCKOUT_MS;
  attempts.set(key, entry);
}

export async function signInAdmin(password: string) {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!expected) return { ok: false as const, reason: "No password is set on this server." };
  if (attemptsExhausted()) {
    return { ok: false as const, reason: "Too many wrong tries. Wait a few minutes and try again." };
  }

  await new Promise((resolve) => setTimeout(resolve, 400));

  if (!sameSecret(password, expected)) {
    recordFailure();
    return { ok: false as const, reason: "That password is not right." };
  }

  attempts.delete("shared");
  (await cookies()).set(COOKIE, sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
  return { ok: true as const };
}

export async function signOutAdmin() {
  (await cookies()).delete(COOKIE);
}

/**
 * The guard every admin server action starts with. A password screen only
 * protects the pages; the actions and API routes behind them are reachable on
 * their own, so each one checks for itself.
 */
export async function denyUnlessAdmin() {
  if (await isAdminSignedIn()) return null;
  return { ok: false as const, message: "Your session has ended. Please sign in again." };
}
