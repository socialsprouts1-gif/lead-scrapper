import { useState, useEffect } from "react";
import { getAnalytics } from "../services/api";

export default function AdminPage() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    getAnalytics()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{
      minHeight: "100vh", background: "var(--bg)",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "var(--t2)",
    }}>
      Loading analytics...
    </div>
  );

  if (error) return (
    <div style={{
      minHeight: "100vh", background: "var(--bg)",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#ff5f7e",
    }}>
      Error: {error}
    </div>
  );

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg)",
      padding: "100px 32px 60px",
      maxWidth: 1000, margin: "0 auto",
    }}>
      <h1 style={{
        fontFamily: "Syne, sans-serif", fontSize: 32,
        fontWeight: 700, marginBottom: 8,
        background: "linear-gradient(135deg,#b89aff,#45d4fa)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
      }}>
        Admin Dashboard
      </h1>
      <p style={{ color: "var(--t3)", fontSize: 13, marginBottom: 40 }}>
        Live data from Supabase
      </p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: 16, marginBottom: 40,
      }}>
        {[
          { label: "Total Searches",  value: data?.totalSearches || 0,  icon: "🔍" },
          { label: "Total Visitors",  value: data?.totalVisitors || 0,  icon: "👥" },
          { label: "Top Keyword",     value: data?.topKeywords?.[0]?.keyword || "—", icon: "🏆" },
          { label: "Top City",        value: data?.topCities?.[0]?.city    || "—", icon: "📍" },
        ].map((stat, i) => (
          <div key={i} style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 14, padding: "24px 20px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{stat.icon}</div>
            <div style={{
              fontFamily: "Syne, sans-serif", fontSize: 26,
              fontWeight: 700, color: "var(--t1)", marginBottom: 4,
            }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 12, color: "var(--t3)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{
          background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: 14, padding: 24,
        }}>
          <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
            Top Keywords
          </h3>
          {(data?.topKeywords || []).map((k, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", padding: "8px 0",
              borderBottom: "1px solid var(--border)",
              fontSize: 13, color: "var(--t2)",
            }}>
              <span>{i + 1}. {k.keyword}</span>
              <span style={{
                background: "rgba(124,111,255,0.1)",
                color: "#b89aff", padding: "2px 10px",
                borderRadius: 50, fontSize: 11, fontWeight: 600,
              }}>
                {k.count} searches
              </span>
            </div>
          ))}
        </div>

        <div style={{
          background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: 14, padding: 24,
        }}>
          <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
            Top Cities
          </h3>
          {(data?.topCities || []).map((c, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", padding: "8px 0",
              borderBottom: "1px solid var(--border)",
              fontSize: 13, color: "var(--t2)",
            }}>
              <span>{i + 1}. {c.city}</span>
              <span style={{
                background: "rgba(0,255,200,0.08)",
                color: "#00ffc8", padding: "2px 10px",
                borderRadius: 50, fontSize: 11, fontWeight: 600,
              }}>
                {c.count} searches
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
