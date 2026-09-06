const axios = require("axios");

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const BASE_URL    = "https://api.apify.com/v2";

// ── Start an actor run and wait for results (with long timeout) ───────────────
async function runActorAndGetResults(actorId, inputPayload) {
  if (!APIFY_TOKEN || APIFY_TOKEN === "PASTE_YOUR_APIFY_TOKEN_HERE") {
    throw new Error("APIFY_API_TOKEN is missing. Open backend/.env and paste your Apify token.");
  }

  console.log(`\n   [Apify] Starting actor: ${actorId}`);
  console.log(`   [Apify] Input:`, JSON.stringify(inputPayload));

  // ── Step 1: Start the actor run ──────────────────────────────────────────
  let startRes;
  try {
    const formattedActorId = actorId.replace("/", "~");
    startRes = await axios.post(
      `${BASE_URL}/acts/${formattedActorId}/runs`,
      inputPayload,
      {
        params:  { token: APIFY_TOKEN },
        headers: { "Content-Type": "application/json" },
        timeout: 30000,
      }
    );
  } catch (err) {
    const status = err.response?.status;
    const detail = err.response?.data?.error?.message || err.message;
    if (status === 401) throw new Error("Apify token is invalid. Check your APIFY_API_TOKEN in .env");
    if (status === 404) throw new Error(`Apify actor not found: ${actorId}`);
    throw new Error(`Failed to start Apify actor: ${detail}`);
  }

  const runId = startRes.data?.data?.id;
  if (!runId) throw new Error("Apify did not return a run ID. Check your token.");
  console.log(`   [Apify] Run started → ID: ${runId}`);

  // ── Step 2: Poll for completion (max 5 minutes, poll every 4 seconds) ────
  const MAX_WAIT_MS  = 5 * 60 * 1000;   // 5 minutes
  const POLL_MS      = 4000;             // check every 4 seconds
  const started      = Date.now();

  while (Date.now() - started < MAX_WAIT_MS) {
    await sleep(POLL_MS);

    let statusRes;
    try {
      statusRes = await axios.get(
        `${BASE_URL}/actor-runs/${runId}`,
        { params: { token: APIFY_TOKEN }, timeout: 15000 }
      );
    } catch (_) {
      continue; // network blip — keep polling
    }

    const status   = statusRes.data?.data?.status;
    const elapsed  = Math.round((Date.now() - started) / 1000);
    console.log(`   [Apify] Status: ${status} (${elapsed}s elapsed)`);

    if (status === "SUCCEEDED") break;

    if (["FAILED", "ABORTED", "TIMED-OUT"].includes(status)) {
      const msg = statusRes.data?.data?.statusMessage || status;
      throw new Error(`Apify actor run ${status}: ${msg}`);
    }
  }

  if (Date.now() - started >= MAX_WAIT_MS) {
    throw new Error("Apify actor exceeded 5 minute timeout. Try a shorter search.");
  }

  // ── Step 3: Fetch results ─────────────────────────────────────────────────
  console.log(`   [Apify] Fetching results...`);
  const resultsRes = await axios.get(
    `${BASE_URL}/actor-runs/${runId}/dataset/items`,
    {
      params:  { token: APIFY_TOKEN, format: "json", clean: true },
      timeout: 30000,
    }
  );

  const items = resultsRes.data || [];
  console.log(`   [Apify] ✓ Got ${items.length} results`);
  return items;
}

async function searchSocials(businessName, city) {
  try {
    const [igResults, liResults] = await Promise.all([
      runActorAndGetResults("apify/google-search-scraper", {
        queries: `site:instagram.com "${businessName}" "${city}"`,
        maxPagesPerQuery: 1,
        resultsPerPage: 3,
      }).catch(() => []),
      runActorAndGetResults("apify/google-search-scraper", {
        queries: `site:linkedin.com/company "${businessName}"`,
        maxPagesPerQuery: 1,
        resultsPerPage: 3,
      }).catch(() => []),
    ]);

    let instagram = null;
    let linkedin = null;

    const igItems = igResults?.[0]?.organicResults || [];
    for (const r of igItems) {
      const url = r?.url || r?.link || "";
      if (
        url.includes("instagram.com/") &&
        !url.includes("/p/") &&
        !url.includes("/reel/")
      ) {
        instagram = url.split("?")[0];
        break;
      }
    }

    const liItems = liResults?.[0]?.organicResults || [];
    for (const r of liItems) {
      const url = r?.url || r?.link || "";
      if (
        url.includes("linkedin.com/company/") ||
        url.includes("linkedin.com/in/")
      ) {
        linkedin = url.split("?")[0];
        break;
      }
    }

    return { instagram, linkedin };
  } catch (_) {
    return { instagram: null, linkedin: null };
  }
}

// ── Google Maps scraper ───────────────────────────────────────────────────────
async function searchGoogleMaps(keyword, city) {
  const items = await runActorAndGetResults(
    "compass/crawler-google-places",
    {
      // The only required field — everything else is optional
      searchStringsArray:        [`${keyword} in ${city}`],
      maxCrawledPlacesPerSearch: 300,     // adapt dynamically to find all available leads
      language:                  "en",
      countryCode:               "in",   // India
    }
  );

  console.log(`   [Apify] Searching social profiles for ${items.length} businesses in batches of 5...`);

  const leads = [];
  const batchSize = 5;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    console.log(`   [Apify] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)}...`);
    const batchLeads = await Promise.all(
      batch.map(async (p) => {
        const baseLead = {
          name:      p.title        || p.name        || "Unknown",
          address:   p.address      || p.street      || "",
          phone:     p.phone        || p.phoneUnformatted || null,
          rating:    p.totalScore   || p.rating      || null,
          reviews:   p.reviewsCount || p.reviewCount || 0,
          maps_url:  p.url          || p.googleMapsUrl || null,
          website:   p.website      || null,
          instagram: p.instagram    || p.instagramUrl  || null,
          linkedin:  p.linkedin     || p.linkedInUrl   || null,
          facebook:  p.facebook     || p.facebookUrl   || null,
          photo:     p.imageUrl     || p.thumbnail     || null,
          category:  keyword,
          city:      city,
        };

        if (!baseLead.instagram || !baseLead.linkedin) {
          console.log(`   [Social] Looking up: ${baseLead.name}`);
          const socials = await searchSocials(baseLead.name, city);
          if (!baseLead.instagram && socials.instagram) {
            baseLead.instagram = socials.instagram;
            console.log(`   [Social] ✓ Instagram found: ${socials.instagram}`);
          }
          if (!baseLead.linkedin && socials.linkedin) {
            baseLead.linkedin = socials.linkedin;
            console.log(`   [Social] ✓ LinkedIn found: ${socials.linkedin}`);
          }
        }

        return baseLead;
      })
    );
    leads.push(...batchLeads);
  }

  console.log(`   [Apify] ✓ All leads enriched with social profiles`);
  return leads;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = { searchGoogleMaps };
