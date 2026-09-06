const express  = require("express");
const router   = express.Router();
const { searchGoogleMaps }    = require("../utils/apify");
const { logSearch, saveLeads, getCachedResults, clearCache } = require("../utils/supabase");

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/search
// Body: { keyword: string, city: string }
// Returns real scraped data from Google Maps via Apify
// ─────────────────────────────────────────────────────────────────────────────
router.post("/search", async (req, res) => {
  const { keyword, city, userName, userEmail, forceRefresh } = req.body;

  if (!keyword || !city) {
    return res.status(400).json({ error: "keyword and city are required" });
  }

  const userIp =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket.remoteAddress ||
    "unknown";

  try {
    console.log(`\n🔍 Searching: "${keyword}" in "${city}" (forceRefresh: ${!!forceRefresh})`);

    if (forceRefresh) {
      console.log(`   [Cache] Force refresh enabled — clearing cache first`);
      await clearCache(keyword, city);
    }

    const cached = forceRefresh ? null : await getCachedResults(keyword, city);
    if (cached && cached.length > 0) {
      console.log(`   [Cache] Serving cached results — skipping Apify`);
      return res.json({
        results: cached,
        total: cached.length,
        keyword,
        city,
        fromCache: true,
      });
    }

    // Apify does everything in ONE call:
    // → Google Maps search
    // → Phone number extraction
    // → Social links (Instagram, LinkedIn, Facebook) from business pages
    const leads = await searchGoogleMaps(keyword, city);

    if (!leads.length) {
      await logSearch(keyword, city, userIp, 0, userName, userEmail);
      return res.json({ results: [], total: 0, keyword, city });
    }

    console.log(`   ✓ Got ${leads.length} real leads from Apify`);

    // Save to Supabase in background — don't make user wait
    logSearch(keyword, city, userIp, leads.length, userName, userEmail).catch(() => {});
    saveLeads(keyword, city, leads).catch(() => {});

    return res.json({
      results: leads,
      total:   leads.length,
      keyword,
      city,
    });

  } catch (err) {
    console.error("Search error:", err.message);

    // Give the user a helpful message based on error type
    let userMessage = "Search failed. Please try again.";
    if (err.message.includes("APIFY_API_TOKEN")) {
      userMessage = "Apify API token is missing. Please add it to your .env file.";
    } else if (err.message.includes("FAILED")) {
      userMessage = "The scraper failed to run. Please try a different keyword or city.";
    } else if (err.message.includes("timed out")) {
      userMessage = "Search took too long. Please try again with a more specific keyword.";
    }

    return res.status(500).json({ error: userMessage, detail: err.message });
  }
});

router.post("/search/refresh", async (req, res) => {
  const { keyword, city } = req.body;
  if (!keyword || !city) {
    return res.status(400).json({ error: "keyword and city are required" });
  }
  await clearCache(keyword, city);
  res.json({ success: true, message: "Cache cleared. Next search will fetch fresh data." });
});

module.exports = router;
