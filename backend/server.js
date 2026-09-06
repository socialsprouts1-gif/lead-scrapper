require("dotenv").config();
const express   = require("express");
const cors      = require("cors");
const helmet    = require("helmet");
const morgan    = require("morgan");
const rateLimit = require("express-rate-limit");

const searchRouter    = require("./routes/search");
const exportRouter    = require("./routes/export");
const analyticsRouter = require("./routes/analytics");
const { logVisitor }  = require("./utils/supabase");

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Security Middleware ───────────────────────────────────────────────────────
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json({ limit: "5mb" }));
app.use(cors({
  origin: (origin, callback) => {
    // Dynamic origin mirroring allows credential sharing (cookies/auth) from any domain (like Vercel)
    callback(null, true);
  },
  methods:     ["GET", "POST", "OPTIONS"],
  credentials: true,
}));

// ── Increase timeout to 6 minutes for scraping requests ──────────────────────
// Apify scraping can take 2-3 minutes — default Express timeout is too short
app.use((req, res, next) => {
  res.setTimeout(360000); // 6 minutes
  next();
});

// ── Rate Limiting ─────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      50,
  message:  { error: "Too many requests, please try again in a few minutes." },
});
app.use("/api/", limiter);

// ── Visitor Tracking ──────────────────────────────────────────────────────────
app.use(async (req, res, next) => {
  if (req.path === "/api/search") {
    const ip = req.headers["x-forwarded-for"]?.split(",")[0]
               || req.socket.remoteAddress || "unknown";
    const ua = req.headers["user-agent"] || "unknown";
    const { userName, userEmail } = req.body || {};
    logVisitor(ip, ua, userName, userEmail).catch(() => {});
  }
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api", searchRouter);
app.use("/api", exportRouter);
app.use("/api", analyticsRouter);

// Track general site visits
app.post("/api/visit", async (req, res) => {
  try {
    const ip = req.headers["x-forwarded-for"]?.split(",")[0]
               || req.socket.remoteAddress || "unknown";
    const ua = req.headers["user-agent"] || "unknown";
    const { name, email } = req.body || {};
    await logVisitor(ip, ua, name, email);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Health Check — shows if keys are set ─────────────────────────────────────
app.get("/health", (req, res) => {
  const apifyOk   = !!process.env.APIFY_API_TOKEN   && process.env.APIFY_API_TOKEN   !== "PASTE_YOUR_APIFY_TOKEN_HERE";
  const supabaseOk = !!process.env.SUPABASE_URL     && process.env.SUPABASE_URL      !== "PASTE_YOUR_SUPABASE_URL_HERE";
  res.json({
    status:    "ok",
    timestamp: new Date().toISOString(),
    keys: {
      apify:    apifyOk    ? "✓ SET" : "✗ MISSING",
      supabase: supabaseOk ? "✓ SET" : "✗ MISSING",
    }
  });
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: "Route not found" }));

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err.message);
  res.status(500).json({ error: "Internal server error", detail: err.message });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  const apifyOk    = !!process.env.APIFY_API_TOKEN && process.env.APIFY_API_TOKEN !== "PASTE_YOUR_APIFY_TOKEN_HERE";
  const supabaseOk = !!process.env.SUPABASE_URL    && process.env.SUPABASE_URL   !== "PASTE_YOUR_SUPABASE_URL_HERE";
  console.log(`\n🚀 LeadFinder backend → http://localhost:${PORT}`);
  console.log(`🔑 Apify token:   ${apifyOk    ? "✓ SET" : "✗ MISSING — open backend/.env and paste it"}`);
  console.log(`🗄️  Supabase URL:  ${supabaseOk ? "✓ SET" : "✗ MISSING — open backend/.env and paste it"}`);
  console.log(`📋 Health check  → http://localhost:${PORT}/health\n`);
});

// Handle port already in use error
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use!`);
    console.error(`\nTo fix this, run in PowerShell as Administrator:\n`);
    console.error(`  netstat -ano | findstr :${PORT}  (find the PID)`);
    console.error(`  Stop-Process -Id <PID> -Force    (kill the process)\n`);
    console.error(`Or change PORT in backend/.env file\n`);
    process.exit(1);
  } else {
    throw err;
  }
});
