const express = require("express");
const router  = express.Router();
const XLSX    = require("xlsx");

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/export
// Body: { results: Lead[], keyword: string, city: string }
// Returns a downloadable .xlsx file with all lead data
// ─────────────────────────────────────────────────────────────────────────────
router.post("/export", (req, res) => {
  const { results, keyword = "leads", city = "city" } = req.body;

  if (!results || !Array.isArray(results) || results.length === 0) {
    return res.status(400).json({ error: "No results to export" });
  }

  try {
    // ── Sheet 1: Full Leads Data ────────────────────────────────────────────
    const leadsData = results.map((l, i) => ({
      "S.No":             i + 1,
      "Business Name":    l.name       || "",
      "City":             l.city       || city,
      "Address":          l.address    || "",
      "Phone":            l.phone      || "—",
      "Rating":           l.rating     || "—",
      "Total Reviews":    l.reviews    || 0,
      "Google Maps Link": l.maps_url   || "—",
      "Instagram":        l.instagram  || "—",
      "LinkedIn":         l.linkedin   || "—",
      "Facebook":         l.facebook   || "—",
      "Website":          l.website    || "—",
      "Scraped On":       new Date().toLocaleDateString("en-IN"),
    }));

    const ws1 = XLSX.utils.json_to_sheet(leadsData);
    ws1["!cols"] = [
      { wch: 5  },   // S.No
      { wch: 32 },   // Business Name
      { wch: 16 },   // City
      { wch: 45 },   // Address
      { wch: 18 },   // Phone
      { wch: 8  },   // Rating
      { wch: 14 },   // Reviews
      { wch: 52 },   // Maps Link
      { wch: 42 },   // Instagram
      { wch: 44 },   // LinkedIn
      { wch: 40 },   // Facebook
      { wch: 38 },   // Website
      { wch: 14 },   // Scraped On
    ];

    // ── Sheet 2: Summary ────────────────────────────────────────────────────
    const withPhone    = results.filter((l) => l.phone).length;
    const withIg       = results.filter((l) => l.instagram).length;
    const withLi       = results.filter((l) => l.linkedin).length;
    const withFb       = results.filter((l) => l.facebook).length;
    const withWeb      = results.filter((l) => l.website).length;
    const ratedLeads   = results.filter((l) => l.rating);
    const avgRating    = ratedLeads.length > 0
      ? (ratedLeads.reduce((s, l) => s + l.rating, 0) / ratedLeads.length).toFixed(1)
      : "—";

    const summaryData = [
      { "Field": "Search Keyword",        "Value": keyword },
      { "Field": "City",                  "Value": city },
      { "Field": "Total Leads Found",     "Value": results.length },
      { "Field": "Leads with Phone",      "Value": withPhone },
      { "Field": "Leads with Instagram",  "Value": withIg },
      { "Field": "Leads with LinkedIn",   "Value": withLi },
      { "Field": "Leads with Facebook",   "Value": withFb },
      { "Field": "Leads with Website",    "Value": withWeb },
      { "Field": "Average Rating",        "Value": avgRating },
      { "Field": "Data Source",           "Value": "Apify — Google Maps Scraper" },
      { "Field": "Exported On",           "Value": new Date().toLocaleString("en-IN") },
    ];

    const ws2 = XLSX.utils.json_to_sheet(summaryData);
    ws2["!cols"] = [{ wch: 24 }, { wch: 36 }];

    // ── Build Workbook ──────────────────────────────────────────────────────
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, `${keyword} - ${city}`);
    XLSX.utils.book_append_sheet(wb, ws2, "Summary");

    const buffer   = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const filename = `LeadFinder_${keyword}_${city}_${Date.now()}.xlsx`.replace(/\s+/g, "_");

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);

  } catch (err) {
    console.error("Export error:", err.message);
    res.status(500).json({ error: "Export failed" });
  }
});

module.exports = router;
