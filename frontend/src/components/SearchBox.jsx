import { useState } from "react";
import { Search } from "lucide-react";

const QUICK_TAGS = [
  
];

export default function SearchBox({ onSearch, loading }) {
  const [keyword, setKeyword] = useState("");
  const [city, setCity] = useState("");
  const [forceRefresh, setForceRefresh] = useState(false);

  const getHistory = () => {
    try {
      return JSON.parse(localStorage.getItem("lf_search_history") || "[]");
    } catch (_) { return []; }
  };

  const saveToHistory = (kw, ct) => {
    try {
      const history = getHistory().filter(
        h => !(h.keyword === kw && h.city === ct)
      );
      history.unshift({ keyword: kw, city: ct, time: Date.now() });
      localStorage.setItem(
        "lf_search_history",
        JSON.stringify(history.slice(0, 5))
      );
    } catch (_) {}
  };

  const submit = () => {
    if (!keyword.trim() || !city.trim()) return;
    saveToHistory(keyword, city);
    onSearch(keyword, city, forceRefresh);
  };

  const handleKey = (e) => {
    if (e.key === "Enter") submit();
  };

  const quickSearch = (kw, ct) => {
    setKeyword(kw);
    setCity(ct);
    onSearch(kw, ct, forceRefresh);
  };

  return (
    <div style={{ width: "100%", maxWidth: 740 }}>
      {/* Search Card */}
      <div className="search-card" style={{
        background: "rgba(18,18,32,0.9)",
        border: "1px solid rgba(255,255,255,0.11)",
        borderRadius: 20,
        padding: "18px 18px 18px 24px",
        boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,111,255,0.08)",
        transition: "border-color 0.3s, box-shadow 0.3s",
      }}>
        {/* Keyword */}
        <div className="search-input-group" style={{ minWidth: 160 }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "1.2px", color: "var(--t3)", fontWeight: 600, marginBottom: 5 }}>
            Looking for
          </div>
          <input
            id="kw"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onKeyDown={handleKey}
            placeholder="plumber, doctor, developer..."
            disabled={loading}
            style={{
              width: "100%", background: "none", border: "none", outline: "none",
              color: "var(--t1)", fontSize: 15, fontFamily: "DM Sans, sans-serif",
            }}
          />
        </div>

        {/* Divider */}
        <div className="search-divider" style={{ width: 1, height: 40, background: "rgba(255,255,255,0.11)", flexShrink: 0 }} />

        {/* City */}
        <div className="search-input-group" style={{ minWidth: 140 }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "1.2px", color: "var(--t3)", fontWeight: 600, marginBottom: 5 }}>
            City
          </div>
          <input
            id="ct"
            value={city}
            onChange={e => setCity(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Akola, Pune, Mumbai..."
            disabled={loading}
            style={{
              width: "100%", background: "none", border: "none", outline: "none",
              color: "var(--t1)", fontSize: 15, fontFamily: "DM Sans, sans-serif",
            }}
          />
        </div>

        {/* Button */}
        <button
          className="search-button"
          onClick={submit}
          disabled={loading || !keyword.trim() || !city.trim()}
          style={{
            background: loading
              ? "rgba(124,111,255,0.4)"
              : "linear-gradient(135deg,#7c6fff,#9b6fff,#45d4fa)",
            color: "#fff", border: "none",
            padding: "13px 28px", borderRadius: 12,
            fontFamily: "Syne, sans-serif", fontSize: 14, fontWeight: 700,
            display: "flex", alignItems: "center", gap: 8,
            transition: "all 0.25s", whiteSpace: "nowrap", flexShrink: 0,
            opacity: !keyword.trim() || !city.trim() ? 0.6 : 1,
            cursor: loading || !keyword.trim() || !city.trim() ? "not-allowed" : "pointer",
          }}
        >
          {loading ? (
            <div style={{
              width: 16, height: 16, borderRadius: "50%",
              border: "2px solid rgba(255,255,255,0.3)",
              borderTopColor: "#fff",
              animation: "spin 0.7s linear infinite",
            }} />
          ) : <Search size={16} />}
          {loading ? "Searching..." : "Find Leads"}
        </button>
      </div>

      {/* Force Refresh Checkbox */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 14 }}>
        <input 
          type="checkbox" 
          id="force-refresh-cb" 
          checked={forceRefresh} 
          onChange={e => setForceRefresh(e.target.checked)}
          style={{ cursor: "pointer", width: 14, height: 14 }}
        />
        <label htmlFor="force-refresh-cb" style={{ fontSize: 12, color: "var(--t2)", cursor: "pointer", userSelect: "none", fontFamily: "DM Sans, sans-serif" }}>
          Fetch fresh live data (bypass cache)
        </label>
      </div>

      {/* Quick Tags */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 16 }}>
        {QUICK_TAGS.map((t) => (
          <button
            key={t.label}
            onClick={() => quickSearch(t.kw, t.city)}
            disabled={loading}
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 50, padding: "6px 14px",
              fontSize: 12, color: "var(--t2)",
              transition: "all 0.2s",
              cursor: loading ? "not-allowed" : "pointer",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "rgba(124,111,255,0.1)";
              e.currentTarget.style.borderColor = "rgba(124,111,255,0.25)";
              e.currentTarget.style.color = "#b89aff";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "rgba(255,255,255,0.03)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
              e.currentTarget.style.color = "var(--t2)";
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
 
      {getHistory().length > 0 && (
        <div style={{
          display: "flex", gap: 6, flexWrap: "wrap",
          justifyContent: "center", marginTop: 10,
        }}>
          <span style={{ fontSize: 11, color: "var(--t3)", alignSelf: "center" }}>
            Recent:
          </span>
          {getHistory().map((h, i) => (
            <button
              key={i}
              onClick={() => quickSearch(h.keyword, h.city)}
              disabled={loading}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 50, padding: "4px 12px",
                fontSize: 11, color: "var(--t3)", cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              🕐 {h.keyword} · {h.city}
            </button>
          ))}
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
