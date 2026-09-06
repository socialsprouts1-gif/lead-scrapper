import { useRef } from "react";
import { useSearch } from "../hooks/useSearch";
import SearchBox from "../components/SearchBox";
import LoadingOverlay from "../components/LoadingOverlay";
import ResultsSection from "../components/ResultsSection";

export default function HomePage() {
  const { results, loading, error, lastSearch, loadingStep, search } = useSearch();
  const resultsRef = useRef(null);

  const handleSearch = async (keyword, city, forceRefresh = false) => {
    await search(keyword, city, forceRefresh);
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
  };

  return (
    <>
      {/* Loading overlay */}
      <LoadingOverlay
        visible={loading}
        step={loadingStep}
        keyword={lastSearch?.keyword || ""}
        city={lastSearch?.city || ""}
      />

      {/* Mesh background blobs */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
        {[
          { w: 700, h: 700, bg: "#7c6fff", top: "-200px", left: "-100px", delay: "0s" },
          { w: 600, h: 600, bg: "#45d4fa", top: "-100px", right: "-200px", delay: "-4s" },
          { w: 500, h: 500, bg: "#f472b6", bottom: "20%", left: "20%", delay: "-8s" },
        ].map((b, i) => (
          <div key={i} style={{
            position: "absolute", borderRadius: "50%",
            width: b.w, height: b.h,
            background: b.bg,
            top: b.top, left: b.left, right: b.right, bottom: b.bottom,
            filter: "blur(120px)", opacity: 0.09,
            animation: `float 12s ease-in-out infinite`,
            animationDelay: b.delay,
          }} />
        ))}
      </div>

      {/* HERO */}
      <section style={{
        position: "relative", zIndex: 1,
        minHeight: "100vh",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "100px 24px 60px", textAlign: "center",
      }}>
        {/* Badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "rgba(0,255,200,0.06)",
          border: "1px solid rgba(0,255,200,0.15)",
          borderRadius: 50, padding: "6px 18px",
          fontSize: 11, fontWeight: 600, color: "#00ffc8",
          letterSpacing: "1.5px", textTransform: "uppercase",
          marginBottom: 32,
          animation: "fadeUp 0.5s ease both",
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%", background: "#00ffc8",
            animation: "pulse 1.4s ease-in-out infinite",
          }} />
          Live Data — Any Business, Any City
        </div>

        {/* H1 */}
        <h1 style={{
          fontFamily: "Syne, sans-serif",
          fontSize: "clamp(46px, 8vw, 96px)",
          fontWeight: 700, lineHeight: 0.95, letterSpacing: "-3px",
          marginBottom: 28, animation: "fadeUp 0.6s ease 0.05s both",
        }}>
          <span style={{ display: "block", color: "var(--t1)" }}>Search. Find.</span>
          <span style={{
            display: "block",
            background: "linear-gradient(135deg,#b89aff 0%,#45d4fa 50%,#00ffc8 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>Connect.</span>
        </h1>

        {/* Subheading */}
        <p style={{
          fontSize: 17, color: "var(--t2)", maxWidth: 520,
          lineHeight: 1.75, fontWeight: 300, marginBottom: 52,
          animation: "fadeUp 0.6s ease 0.1s both",
        }}>
          Find plumbers, doctors, developers, mechanics, barbers — anyone, anywhere in India.
          Get their phone, address, Instagram, LinkedIn and website all in one place.
        </p>

        {/* Search box */}
        <div style={{ animation: "fadeUp 0.6s ease 0.15s both", width: "100%", display: "flex", justifyContent: "center" }}>
          <SearchBox onSearch={handleSearch} loading={loading} />
        </div>

        <div style={{
          width: "100%", maxWidth: 740,
          marginTop: 32, animation: "fadeUp 0.6s ease 0.2s both",
        }}>
          <div style={{
            fontSize: 11, color: "var(--t3)", textAlign: "center",
            textTransform: "uppercase", letterSpacing: "1.5px",
            marginBottom: 14, fontWeight: 600,
          }}>
            Browse by Category
          </div>
          <div className="category-container">
            {[
              { icon: "👨‍⚕️", label: "Doctors"      },
              { icon: "🔧", label: "Plumbers"     },
              { icon: "⚡", label: "Electricians" },
              { icon: "🔩", label: "Mechanics"    },
              { icon: "🦷", label: "Dentists"     },
              { icon: "💻", label: "Developers"   },
              { icon: "✂️", label: "Barbers"      },
              { icon: "🏋️", label: "Gyms"         },
              { icon: "📊", label: "CAs"          },
              { icon: "⚖️", label: "Lawyers"      },
              { icon: "🏨", label: "Hotels"       },
              { icon: "🍽️", label: "Restaurants"  },
            ].map((cat) => (
              <button
                key={cat.label}
                onClick={() => {
                  const city = document.getElementById("ct")?.value?.trim() || "";
                  if (!city) {
                    document.getElementById("ct")?.focus();
                    return;
                  }
                  document.getElementById("kw").value = cat.label;
                  handleSearch(cat.label, city);
                }}
                className="category-btn"
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            marginTop: 16, padding: "12px 20px", borderRadius: 12,
            background: "rgba(255,95,126,0.08)", border: "1px solid rgba(255,95,126,0.2)",
            color: "#ff5f7e", fontSize: 13, maxWidth: 500,
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Stats */}
        <div className="stats-container" style={{ animation: "fadeUp 0.6s ease 0.25s both" }}>
          {[
            { n: "50K+", l: "Leads Found" },
            { n: "200+", l: "Cities" },
            { n: "3", l: "Data Sources" },
            { n: "Real-time", l: "Live Data" },
          ].map((s, i) => (
            <div key={i} className="stats-box">
              <div style={{
                fontFamily: "Syne, sans-serif", fontSize: 26, fontWeight: 700,
                background: "linear-gradient(135deg,var(--t1),#b89aff)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>{s.n}</div>
              <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Results */}
      <div ref={resultsRef} style={{ position: "relative", zIndex: 1 }}>
        <ResultsSection
          results={results}
          lastSearch={lastSearch}
          onRefresh={() => lastSearch && handleSearch(lastSearch.keyword, lastSearch.city, true)}
        />
      </div>

      {/* Footer */}
      <footer style={{
        position: "relative", zIndex: 1,
        borderTop: "1px solid var(--border)",
        padding: "32px 48px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 16,
      }}>
        <div>
          <div style={{
            fontFamily: "Syne, sans-serif", fontSize: 17, fontWeight: 700,
            background: "linear-gradient(135deg,#b89aff,#45d4fa)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>LeadFinder</div>
          <p style={{ fontSize: 12, color: "var(--t3)", marginTop: 4 }}>
            Business intelligence for India. Find anyone, anywhere.
          </p>
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          {["Privacy", "Terms", "Contact"].map(l => (
            <span key={l} style={{ fontSize: 12, color: "var(--t3)", cursor: "pointer" }}>{l}</span>
          ))}
        </div>
      </footer>

      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.5);opacity:0.4} }
        @keyframes float { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(30px,-20px) scale(1.05)} 66%{transform:translate(-20px,15px) scale(0.97)} }
        @media(max-width:640px) {
          h1 { letter-spacing: -1.5px !important; }
          footer { padding: 24px 20px !important; flex-direction: column; text-align: center; }
        }
      `}</style>
    </>
  );
}
