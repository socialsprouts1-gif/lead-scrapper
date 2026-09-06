import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import LoginModal from "./LoginModal";

export default function Navbar() {
  const { user, logout } = useAuth();
  const [scrolled, setScrolled]     = useState(false);
  const [showLogin, setShowLogin]   = useState(false);
  const [dropOpen, setDropOpen]     = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest("#user-menu")) setDropOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  return (
    <>
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}

      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 48px",
        background: scrolled ? "rgba(7,7,13,0.92)" : "rgba(7,7,13,0.5)",
        backdropFilter: "blur(24px)",
        borderBottom: `1px solid ${scrolled ? "rgba(255,255,255,0.08)" : "transparent"}`,
        transition: "all 0.3s",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg,#7c6fff,#45d4fa)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
          }}>🔍</div>
          <span style={{
            fontFamily: "Syne, sans-serif", fontSize: 20, fontWeight: 700,
            background: "linear-gradient(135deg,#b89aff,#45d4fa)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>LeadFinder</span>
        </div>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* LIVE badge */}
          <span className="navbar-live-badge" style={{
            background: "rgba(0,255,200,0.08)",
            border: "1px solid rgba(0,255,200,0.15)",
            color: "#00ffc8", padding: "6px 14px", borderRadius: 50,
            fontSize: 12, fontWeight: 600, letterSpacing: "0.5px",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%", background: "#00ffc8",
              animation: "pulse 1.4s ease-in-out infinite",
            }} />
            LIVE
          </span>

          {/* Auth section */}
          {user ? (
            /* User avatar + dropdown */
            <div id="user-menu" style={{ position: "relative" }}>
              <button
                onClick={() => setDropOpen(p => !p)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 50, padding: "5px 14px 5px 5px",
                  cursor: "pointer", transition: "all 0.2s",
                }}
              >
                <img
                  src={user.picture}
                  alt={user.name}
                  style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }}
                  onError={e => { e.target.style.display = "none"; }}
                />
                <span style={{ fontSize: 13, color: "#eeeeff", fontWeight: 500 }}>
                  {user.name.split(" ")[0]}
                </span>
                <span style={{ fontSize: 10, color: "#8888aa" }}>▾</span>
              </button>

              {/* Dropdown */}
              {dropOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 10px)", right: 0,
                  background: "#11111e",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12, minWidth: 200,
                  boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
                  overflow: "hidden",
                  animation: "dropIn 0.15s ease",
                }}>
                  {/* User info header */}
                  <div style={{
                    padding: "14px 16px",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#eeeeff" }}>{user.name}</div>
                    <div style={{ fontSize: 11, color: "#8888aa", marginTop: 2 }}>{user.email}</div>
                  </div>
                  {/* Admin Panel Link */}
                  {user.email === "hardiksedani2610@gmail.com" && (
                    <Link
                      to="/admin"
                      onClick={() => setDropOpen(false)}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "12px 16px",
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                        color: "#b89aff", fontSize: 13, fontWeight: 500,
                        textDecoration: "none",
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(184,154,255,0.06)"}
                      onMouseLeave={e => e.currentTarget.style.background = "none"}
                    >
                      <span>⚙️</span> Admin Panel
                    </Link>
                  )}
                  {/* Logout */}
                  <button
                    onClick={() => { logout(); setDropOpen(false); }}
                    style={{
                      width: "100%", padding: "12px 16px",
                      background: "none", border: "none",
                      color: "#ff5f7e", fontSize: 13, fontWeight: 500,
                      textAlign: "left", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 8,
                      transition: "background 0.2s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,95,126,0.06)"}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}
                  >
                    <span>↩</span> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Login button */
            <button
              onClick={() => setShowLogin(true)}
              style={{
                background: "linear-gradient(135deg,#7c6fff,#45d4fa)",
                color: "#fff", border: "none",
                padding: "8px 20px", borderRadius: 50,
                fontSize: 13, fontWeight: 600,
                cursor: "pointer", transition: "all 0.2s",
                display: "flex", alignItems: "center", gap: 6,
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.04)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(124,111,255,0.45)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              🔐 Sign in with Google
            </button>
          )}
        </div>
      </nav>

      <style>{`
        @keyframes pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.5);opacity:0.4} }
        @keyframes dropIn { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        @media(max-width:640px){ nav { padding: 14px 20px !important; } }
      `}</style>
    </>
  );
}
