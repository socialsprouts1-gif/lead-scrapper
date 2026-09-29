/**
 * Small date helpers.
 *
 * Reading the clock is deliberately kept out of component bodies: Server
 * Components re-run per request, and keeping `Date.now()` behind a named helper
 * makes the intent ("the last N days") obvious at the call site.
 */

export function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/** ISO day keys (YYYY-MM-DD) for the last `days` days, oldest first. */
export function dayKeysBack(days: number) {
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    keys.push(daysAgo(i).toISOString().slice(0, 10));
  }
  return keys;
}
