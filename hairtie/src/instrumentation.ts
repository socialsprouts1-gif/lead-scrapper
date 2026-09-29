/**
 * Runs once when the server starts, before it takes its first request.
 *
 * That ordering is what lets the rest of the app read the shop synchronously:
 * the document is fetched from Vercel Blob (or read from disk) here, so
 * `store()` always has something to hand back.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { hydrate } = await import("@/lib/store");
  const backend = await hydrate();

  if (backend === "memory") {
    console.warn(
      "[hairtie] Running without persistent storage. Anything changed in the admin — " +
        "including customer orders — will be lost when this server restarts. " +
        "Connect a Vercel Blob store, or run somewhere with a writable disk.",
    );
  }
}
