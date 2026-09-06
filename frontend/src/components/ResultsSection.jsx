import { useState } from "react";
import { RefreshCw, Download, Filter } from "lucide-react";
import LeadCard from "./LeadCard";
import { exportLeads } from "../services/api";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";

const FILTERS = [
  { key: "all", label: "All Results" },
  { key: "phone", label: "📞 Has Phone" },
  { key: "instagram", label: "📸 Has Instagram" },
  { key: "linkedin", label: "💼 Has LinkedIn" },
  { key: "website", label: "🌐 Has Website" },
  { key: "highRating", label: "⭐ 4+ Stars" },
];

function applyFilter(leads, filter) {
  switch (filter) {
    case "phone": return leads.filter(l => l.phone);
    case "instagram": return leads.filter(l => l.instagram);
    case "linkedin": return leads.filter(l => l.linkedin);
    case "website": return leads.filter(l => l.website);
    case "highRating": return leads.filter(l => l.rating >= 4);
    default: return leads;
  }
}

export default function ResultsSection({ results, lastSearch, onRefresh }) {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState("all");
  const [exporting, setExporting] = useState(false);
  const [sortBy, setSortBy] = useState("default");
 
  if (!results.length && !lastSearch) return null;
 
  function sortResults(leads) {
    if (!Array.isArray(leads)) return [];
    const copy = [...leads];
    if (sortBy === "rating")  return copy.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    if (sortBy === "reviews") return copy.sort((a, b) => (b.reviews || 0) - (a.reviews || 0));
    if (sortBy === "quality") return copy.sort((a, b) => {
      const score = (l) =>
        (l.phone ? 1 : 0) + (l.website ? 1 : 0) +
        (l.instagram ? 1 : 0) + (l.linkedin ? 1 : 0) +
        (l.rating >= 4 ? 1 : 0);
      return score(b) - score(a);
    });
    return copy;
  }

  const filtered = sortResults(applyFilter(results, activeFilter));

  const handleExport = async () => {
    if (!results.length) return;
    setExporting(true);
    try {
      await exportLeads(results, lastSearch.keyword, lastSearch.city);
      toast.success(`Exported ${results.length} leads to Excel!`);
    } catch {
      toast.error("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="results-container">
      {/* Header */}
      <div className="results-header" style={{
        marginBottom: 24, gap: 16,
      }}>
        <div>
          <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: 26, fontWeight: 700, letterSpacing: "-0.5px" }}>
            Results for{" "}
            <span style={{ background: "linear-gradient(135deg,#b89aff,#45d4fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {lastSearch?.keyword}
            </span>{" "}in{" "}
            <span style={{ background: "linear-gradient(135deg,#b89aff,#45d4fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {lastSearch?.city}
            </span>
          </h2>
          <p style={{ fontSize: 13, color: "var(--t3)", marginTop: 5 }}>
            Found {results.length} businesses · Google Maps, Instagram, LinkedIn
          </p>
        </div>

        <div className="results-actions" style={{ gap: 10 }}>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{
              background: "var(--card)",
              border: "1px solid rgba(255,255,255,0.11)",
              color: "var(--t2)",
              padding: "9px 14px",
              borderRadius: 10,
              fontSize: 13,
              cursor: "pointer",
              outline: "none",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            <option value="default">Sort: Default</option>
            <option value="rating">Sort: Rating</option>
            <option value="reviews">Sort: Most Reviews</option>
            <option value="quality">Sort: Best Leads</option>
          </select>

          <button onClick={onRefresh} style={{
            background: "transparent", border: "1px solid rgba(255,255,255,0.11)",
            color: "var(--t2)", padding: "9px 18px", borderRadius: 10,
            fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 6,
            transition: "all 0.2s",
          }}>
            <RefreshCw size={13} /> Refresh
          </button>

          {user && results.length > 0 && (
            <button
              onClick={() => {
                const contacts = results
                  .filter(l => l.phone)
                  .map(l => `${l.name} — ${l.phone}`)
                  .join("\n");
                navigator.clipboard.writeText(contacts).then(() => {
                  toast.success(`Copied ${results.filter(l => l.phone).length} phone numbers!`);
                });
              }}
              style={{
                background: "rgba(69,212,250,0.08)",
                border: "1px solid rgba(69,212,250,0.2)",
                color: "#45d4fa",
                padding: "9px 18px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.2s",
              }}
            >
              📋 Copy All Numbers
            </button>
          )}

          <button onClick={handleExport} disabled={exporting} style={{
            background: "linear-gradient(135deg,#166534,#15803d)",
            color: "#fff", border: "none",
            padding: "9px 20px", borderRadius: 10,
            fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
            transition: "all 0.2s",
            opacity: exporting ? 0.7 : 1,
          }}>
            <Download size={13} />
            {exporting ? "Exporting..." : "Export Excel"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "nowrap", overflowX: "auto", paddingBottom: 8 }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            style={{
              background: activeFilter === f.key ? "rgba(124,111,255,0.1)" : "var(--card)",
              border: `1px solid ${activeFilter === f.key ? "rgba(124,111,255,0.3)" : "rgba(255,255,255,0.06)"}`,
              color: activeFilter === f.key ? "#b89aff" : "var(--t2)",
              padding: "7px 16px", borderRadius: 50,
              fontSize: 12, fontWeight: 500,
              display: "flex", alignItems: "center", gap: 6,
              transition: "all 0.2s",
            }}
          >
            {activeFilter === f.key && (
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#b89aff" }} />
            )}
            {f.label}
          </button>
        ))}
        <span style={{ fontSize: 12, color: "var(--t3)", alignSelf: "center", marginLeft: 4 }}>
          {filtered.length} shown
        </span>
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(340px, 100%), 1fr))",
          gap: 14,
        }}>
          {filtered.map((lead, i) => (
            <LeadCard key={`${lead.place_id || lead.name}-${i}`} lead={lead} index={i} />
          ))}
        </div>
      ) : (
        <>
          {filtered.length === 0 && activeFilter === "all" && (
            <div style={{
              textAlign: "center", padding: "60px 24px", color: "var(--t3)",
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
              <div style={{
                fontFamily: "Syne, sans-serif", fontSize: 20,
                color: "var(--t2)", marginBottom: 8,
              }}>
                No results found
              </div>
              <p style={{ fontSize: 13, marginBottom: 24, color: "var(--t3)" }}>
                Try one of these suggestions:
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                {[
                  { label: "Search in Mumbai instead", kw: lastSearch?.keyword, city: "Mumbai" },
                  { label: "Search in Pune instead",   kw: lastSearch?.keyword, city: "Pune"   },
                  { label: "Try Doctors",        kw: "Doctor",       city: lastSearch?.city },
                  { label: "Try Plumbers",       kw: "Plumber",      city: lastSearch?.city },
                  { label: "Try Electricians",   kw: "Electrician",  city: lastSearch?.city },
                ].map((s, i) => (
                  <button
                    key={i}
                    onClick={() => onRefresh && onRefresh(s.kw, s.city)}
                    style={{
                      background: "rgba(124,111,255,0.08)",
                      border: "1px solid rgba(124,111,255,0.2)",
                      color: "#b89aff",
                      padding: "8px 16px",
                      borderRadius: 50,
                      fontSize: 12,
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {filtered.length === 0 && activeFilter !== "all" && (
            <div style={{ textAlign: "center", padding: "60px 24px", color: "var(--t3)" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
              <div style={{
                fontFamily: "Syne, sans-serif", fontSize: 18,
                color: "var(--t2)", marginBottom: 8,
              }}>
                No results for this filter
              </div>
              <p style={{ fontSize: 13 }}>Try clearing the filter to see all results</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
