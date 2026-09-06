const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");

// ─────────────────────────────────────────────────────────────────────────────
// Supabase Client
// ─────────────────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ── Log every search made on the website ──────────────────────────────────────
async function logSearch(keyword, city, userIp, resultCount, userName = "Guest", userEmail = null) {
  try {
    const { error } = await supabase.from("searches").insert({
      keyword:      keyword.toLowerCase().trim(),
      city:         city.trim(),
      user_ip:      userIp,
      user_name:    userName || "Guest",
      user_email:   userEmail || null,
      result_count: resultCount,
    });
    if (error) console.warn("Supabase logSearch error:", error.message);
  } catch (e) {
    console.warn("logSearch failed:", e.message);
  }
}

// ── Save all scraped leads to database ────────────────────────────────────────
async function saveLeads(keyword, city, leads) {
  try {
    if (!leads || !leads.length) return;

    const rows = leads.map((l) => ({
      keyword:         keyword.toLowerCase().trim(),
      city:            city.trim(),
      name:            l.name            || null,
      address:         l.address         || null,
      phone:           l.phone           || null,
      rating:          l.rating          || null,
      reviews:         l.reviews         || 0,
      maps_url:        l.maps_url        || null,
      instagram:       l.instagram       || null,
      linkedin:        l.linkedin        || null,
      facebook:        l.facebook        || null,
      website:         l.website         || null,
      photo_url:       l.photo           || null,
    }));

    const { error } = await supabase.from("leads").insert(rows);
    if (error) console.warn("Supabase saveLeads error:", error.message);
    else console.log(`   ✓ Saved ${rows.length} leads to Supabase`);
  } catch (e) {
    console.warn("saveLeads failed:", e.message);
  }
}

// ── Log every visitor to the website ─────────────────────────────────────────
async function logVisitor(ip, userAgent, userName = "Guest", userEmail = null) {
  try {
    // Get city/country from IP using free geo API
    let geoCity = null, geoCountry = null, geoRegion = null;
    try {
      const geo = await axios.get(
        `http://ip-api.com/json/${ip}?fields=city,country,regionName`,
        { timeout: 3000 }
      );
      geoCity    = geo.data?.city       || null;
      geoCountry = geo.data?.country    || null;
      geoRegion  = geo.data?.regionName || null;
    } catch (_) {}

    const { error } = await supabase.from("visitors").insert({
      ip,
      user_agent:  userAgent,
      geo_city:    geoCity,
      geo_country: geoCountry,
      geo_region:  geoRegion,
      user_name:   userName || "Guest",
      user_email:  userEmail || null,
    });
    if (error) console.warn("Supabase logVisitor error:", error.message);
  } catch (e) {
    console.warn("logVisitor failed:", e.message);
  }
}

// ── Get analytics data for admin view ────────────────────────────────────────
async function getAnalytics() {
  const [searches, visitors, topKeywords, topCities] = await Promise.all([
    supabase.from("searches").select("count", { count: "exact", head: true }),
    supabase.from("visitors").select("count", { count: "exact", head: true }),
    supabase.from("searches").select("keyword").order("created_at", { ascending: false }).limit(200),
    supabase.from("searches").select("city").order("created_at", { ascending: false }).limit(200),
  ]);

  // Count keyword frequency
  const kwMap = {};
  (topKeywords.data || []).forEach((r) => {
    kwMap[r.keyword] = (kwMap[r.keyword] || 0) + 1;
  });
  const topKw = Object.entries(kwMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([keyword, count]) => ({ keyword, count }));

  // Count city frequency
  const cityMap = {};
  (topCities.data || []).forEach((r) => {
    cityMap[r.city] = (cityMap[r.city] || 0) + 1;
  });
  const topCt = Object.entries(cityMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([city, count]) => ({ city, count }));

  return {
    totalSearches: searches.count || 0,
    totalVisitors: visitors.count || 0,
    topKeywords:   topKw,
    topCities:     topCt,
  };
}

async function getCachedResults(keyword, city) {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .eq("keyword", keyword.toLowerCase().trim())
      .eq("city", city.trim())
      .gte("created_at", since)
      .order("created_at", { ascending: false });
    if (error || !data || data.length === 0) return null;
    console.log(`   [Cache] ✓ Returning ${data.length} cached results for "${keyword} in ${city}"`);
    return data;
  } catch (e) {
    console.warn("getCachedResults failed:", e.message);
    return null;
  }
}

async function clearCache(keyword, city) {
  try {
    await supabase
      .from("leads")
      .delete()
      .eq("keyword", keyword.toLowerCase().trim())
      .eq("city", city.trim());
  } catch (e) {
    console.warn("clearCache failed:", e.message);
  }
}

module.exports = { logSearch, saveLeads, logVisitor, getAnalytics, supabase, getCachedResults, clearCache };
