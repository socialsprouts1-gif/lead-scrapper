const express = require("express");
const router = express.Router();
const { getAnalytics } = require("../utils/supabase");

// GET /api/analytics
router.get("/analytics", async (req, res) => {
  const adminEmail = req.headers["x-admin-email"];
  if (adminEmail !== "hardiksedani2610@gmail.com") {
    return res.status(403).json({ error: "Access denied. Admin authorization required." });
  }
  try {
    const data = await getAnalytics();
    res.json(data);
  } catch (err) {
    console.error("Analytics error:", err.message);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

module.exports = router;
