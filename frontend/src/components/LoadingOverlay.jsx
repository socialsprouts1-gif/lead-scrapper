const STEPS = [
  "Connecting to scraper agent...",
  "Searching Google Maps for businesses...",
  "Fetching phone numbers & addresses...",
  "Scanning for Instagram profiles...",
  "Scanning for LinkedIn profiles...",
  "Compiling your results...",
];

export default function LoadingOverlay({ visible, step, keyword, city }) {
  if (!visible) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300,
      background: "rgba(7,7,13,0.97)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 16,
    }}>
      {/* Spinner */}
      <div style={{
        width: 52, height: 52, borderRadius: "50%",
        border: "1.5px solid rgba(255,255,255,0.08)",
        borderTopColor: "#7c6fff",
        animation: "spin 0.75s linear infinite",
      }} />

      <div style={{ fontFamily: "Syne, sans-serif", fontSize: 22, fontWeight: 700 }}>
        Finding real businesses...
      </div>
      <div style={{ fontSize: 13, color: "#8888aa" }}>
        "{keyword}" in {city}
      </div>

      {/* Steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
        {STEPS.map((s, i) => {
          const isDone   = step > i + 1;
          const isActive = step === i + 1;
          return (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 10, fontSize: 13,
              color:  isActive ? "#00ffc8" : isDone ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)",
              transition: "all 0.35s",
            }}>
              <span style={{ fontSize: 9 }}>
                {isDone ? "●" : isActive ? "◉" : "○"}
              </span>
              <span style={{ textDecoration: isDone ? "line-through" : "none" }}>{s}</span>
            </div>
          );
        })}
      </div>

      {/* ⚠️ Important — tell user this takes time */}
      <div style={{
        marginTop: 20,
        background: "rgba(124,111,255,0.08)",
        border: "1px solid rgba(124,111,255,0.2)",
        borderRadius: 10, padding: "10px 20px",
        fontSize: 12, color: "#b89aff", textAlign: "center", maxWidth: 340,
      }}>
        ⏱️ Real scraping takes 1–3 minutes.<br/>
        Please keep this tab open and wait.
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
