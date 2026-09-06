import { useState } from "react";
import { MapPin, Phone, Star, Copy, Check, Globe, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import LoginModal from "./LoginModal";

const AVATAR_COLORS = [
  ["#7c6fff","#1a1830"], ["#45d4fa","#0a2535"], ["#00ffc8","#003a2e"],
  ["#f472b6","#380c2a"], ["#fbbf24","#382c00"], ["#f87171","#380a0a"],
  ["#a78bfa","#1c0f38"], ["#34d399","#0a281a"], ["#60a5fa","#0a1835"],
  ["#fb923c","#381800"],
];

function getColors(name) {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}
function getInitials(name) {
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

// Blurred placeholder for locked fields
function BlurredText({ text }) {
  return (
    <span style={{ filter: "blur(5px)", userSelect: "none", color: "#8888aa", fontSize: 13 }}>
      {text}
    </span>
  );
}

// Small inline lock badge
function LockBadge({ onClick }) {
  return (
    <span onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: "rgba(124,111,255,0.12)", border: "1px solid rgba(124,111,255,0.25)",
      color: "#b89aff", borderRadius: 6, padding: "2px 8px",
      fontSize: 11, fontWeight: 600, cursor: "pointer", marginLeft: 6,
    }}>
      <Lock size={9} /> Login to view
    </span>
  );
}

function isValidSocialLink(url) {
  if (!url) return false;
  const str = String(url).trim().toLowerCase();
  return (
    str !== "" &&
    str !== "null" &&
    str !== "undefined" &&
    str !== "—" &&
    str !== "-" &&
    str !== "n/a" &&
    (str.startsWith("http://") || str.startsWith("https://") || str.includes("instagram.com") || str.includes("linkedin.com") || str.includes("facebook.com"))
  );
}

function getInstagramHandle(url) {
  if (!url) return "Instagram";
  try {
    const clean = url.split("?")[0].replace(/\/$/, "");
    const parts = clean.split("/");
    const handle = parts[parts.length - 1];
    return handle ? `@${handle}` : "Instagram";
  } catch (_) {
    return "Instagram";
  }
}

function getLinkedInHandle(url) {
  if (!url) return "LinkedIn";
  try {
    const clean = url.split("?")[0].replace(/\/$/, "");
    const parts = clean.split("/");
    const handle = parts[parts.length - 1];
    return handle ? handle : "LinkedIn";
  } catch (_) {
    return "LinkedIn";
  }
}

export default function LeadCard({ lead, index }) {
  const { user }                        = useAuth();
  const [copied, setCopied]             = useState(false);
  const [saved, setSaved]               = useState(false);
  const [hovered, setHovered]           = useState(false);
  const [showLogin, setShowLogin]       = useState(false);

  const isLoggedIn                      = !!user;
  const [accentColor, bgColor]          = getColors(lead.name);
  const requireLogin                    = () => setShowLogin(true);

  const copyContact = async () => {
    if (!isLoggedIn) { requireLogin(); return; }
    const text = [lead.name, lead.phone, lead.address].filter(Boolean).join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Contact copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const saveCard = () => {
    if (!isLoggedIn) { requireLogin(); return; }
    setSaved(true);
    toast.success("Lead saved!");
  };

  const getQualityScore = (lead) => {
    let score = 0;
    if (lead.phone)     score += 1;
    if (lead.website)   score += 1;
    if (lead.instagram) score += 1;
    if (lead.linkedin)  score += 1;
    if (lead.rating >= 4) score += 1;
    return score;
  };

  const qualityScore = getQualityScore(lead);
  const qualityLabel = qualityScore >= 4 ? "🔥 Hot Lead"
    : qualityScore >= 3 ? "✅ Good Lead"
    : qualityScore >= 2 ? "⚡ Average"
    : "📋 Basic";
  const qualityColor = qualityScore >= 4 ? "#ff5f7e"
    : qualityScore >= 3 ? "#00ffc8"
    : qualityScore >= 2 ? "#ffd166"
    : "#8888aa";

  return (
    <>
      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
          reason={`Sign in to see the full contact details, address, phone and social profiles for ${lead.name}.`}
        />
      )}

      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: "var(--card)",
          border: `1px solid ${hovered ? "rgba(255,255,255,0.11)" : "rgba(255,255,255,0.06)"}`,
          borderRadius: 14, padding: 22,
          position: "relative", overflow: "hidden",
          transform: hovered ? "translateY(-3px)" : "translateY(0)",
          boxShadow: hovered ? "0 16px 48px rgba(0,0,0,0.5)" : "none",
          transition: "all 0.25s",
          animation: `cardIn 0.35s ease ${index * 40}ms both`,
        }}
      >
        {/* Accent line on hover */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, ${accentColor}, #45d4fa)`,
          opacity: hovered ? 1 : 0, transition: "opacity 0.3s",
        }} />

        {/* Login nudge banner — only for logged-out users */}
        {!isLoggedIn && (
          <div onClick={requireLogin} style={{
            position: "absolute", top: 0, left: 0, right: 0,
            background: "rgba(124,111,255,0.06)",
            borderBottom: "1px solid rgba(124,111,255,0.15)",
            padding: "7px 12px",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            fontSize: 11, color: "#b89aff", fontWeight: 600, cursor: "pointer", zIndex: 2,
          }}>
            <Lock size={10} /> Sign in to unlock full details
          </div>
        )}
        {!isLoggedIn && <div style={{ height: 28 }} />}

        {/* Top row — avatar + rating */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: bgColor, color: accentColor,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "Syne, sans-serif", fontSize: 16, fontWeight: 700, flexShrink: 0,
          }}>
            {getInitials(lead.name)}
          </div>
          {lead.rating && (
            <div style={{
              display: "flex", alignItems: "center", gap: 4,
              background: "rgba(255,209,102,0.08)", border: "1px solid rgba(255,209,102,0.15)",
              padding: "4px 10px", borderRadius: 50, fontSize: 12, color: "#ffd166", fontWeight: 500,
            }}>
              <Star size={11} fill="#ffd166" />
              {lead.rating}
              {lead.reviews > 0 && <span style={{ color: "var(--t3)", fontWeight: 400 }}>({lead.reviews})</span>}
            </div>
          )}
        </div>

        {/* Business name — always visible */}
        <div style={{ fontFamily: "Syne, sans-serif", fontSize: 16, fontWeight: 700, marginBottom: 3, lineHeight: 1.3 }}>
          {lead.name}
        </div>
        <div style={{ fontSize: 11, color: accentColor, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 14 }}>
          {lead.category || "Business"}
        </div>

        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          background: `${qualityColor}12`,
          border: `1px solid ${qualityColor}30`,
          color: qualityColor,
          borderRadius: 50,
          padding: "3px 10px",
          fontSize: 11,
          fontWeight: 600,
          marginBottom: 12,
        }}>
          {qualityLabel}
        </div>

        {/* Address — blurred if not logged in */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 15 }}>
          {lead.address && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "var(--t2)" }}>
              <MapPin size={13} style={{ flexShrink: 0, marginTop: 1, color: "var(--t3)" }} />
              {isLoggedIn
                ? <span>{lead.address}</span>
                : <span style={{ display: "flex", alignItems: "center" }}>
                    <BlurredText text={lead.address} /><LockBadge onClick={requireLogin} />
                  </span>
              }
            </div>
          )}

          {/* Phone — blurred if not logged in */}
          {lead.phone && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--t2)" }}>
              <Phone size={13} style={{ flexShrink: 0, color: "var(--t3)" }} />
              {isLoggedIn
                ? <a href={`tel:${lead.phone}`} style={{ color: "var(--t2)", transition: "color 0.2s" }}
                    onMouseEnter={e => e.target.style.color = "#45d4fa"}
                    onMouseLeave={e => e.target.style.color = "var(--t2)"}>{lead.phone}</a>
                : <span style={{ display: "flex", alignItems: "center" }}>
                    <BlurredText text={lead.phone} /><LockBadge onClick={requireLogin} />
                  </span>
              }
            </div>
          )}
        </div>

        {/* Social badges — locked if not logged in */}
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 15 }}>

          {/* Google Maps */}
          {lead.maps_url && (
            isLoggedIn
              ? <a href={lead.maps_url} target="_blank" rel="noreferrer" style={badge("#4285f4")}>
                  <MapsIcon /> Maps
                </a>
              : <span onClick={requireLogin} style={{ ...badge("#4285f4"), opacity: 0.4, cursor: "pointer" }}>
                  <Lock size={9} /> Maps
                </span>
          )}

          {/* Instagram */}
          {isValidSocialLink(lead.instagram) && (
            isLoggedIn
              ? <a href={lead.instagram} target="_blank" rel="noreferrer" style={badge("#e1306c")}>
                  <IgIcon /> {getInstagramHandle(lead.instagram)}
                </a>
              : <span onClick={requireLogin} style={{ ...badge("#e1306c"), opacity: 0.4, cursor: "pointer" }}>
                  <Lock size={9} /> Instagram
                </span>
          )}

          {/* LinkedIn */}
          {isValidSocialLink(lead.linkedin) && (
            isLoggedIn
              ? <a href={lead.linkedin} target="_blank" rel="noreferrer" style={badge("#0077b5")}>
                  <LiIcon /> {getLinkedInHandle(lead.linkedin)}
                </a>
              : <span onClick={requireLogin} style={{ ...badge("#0077b5"), opacity: 0.4, cursor: "pointer" }}>
                  <Lock size={9} /> LinkedIn
                </span>
          )}

          {/* Facebook */}
          {isValidSocialLink(lead.facebook) && (
            isLoggedIn
              ? <a href={lead.facebook} target="_blank" rel="noreferrer" style={badge("#1877f2")}>
                  <FbIcon /> Facebook
                </a>
              : <span onClick={requireLogin} style={{ ...badge("#1877f2"), opacity: 0.4, cursor: "pointer" }}>
                  <Lock size={9} /> Facebook
                </span>
          )}

          {/* Website */}
          {isValidSocialLink(lead.website) && (
            isLoggedIn
              ? <a href={lead.website} target="_blank" rel="noreferrer" style={badge("#00ffc8", true)}>
                  <Globe size={11} /> Website
                </a>
              : <span onClick={requireLogin} style={{ ...badge("#00ffc8", true), opacity: 0.4, cursor: "pointer" }}>
                  <Lock size={9} /> Website
                </span>
          )}
        </div>

        {/* Footer actions */}
        <div className="card-footer">
          <button onClick={copyContact} style={{
            flex: 1,
            background: isLoggedIn ? "rgba(124,111,255,0.07)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${isLoggedIn ? "rgba(124,111,255,0.15)" : "rgba(255,255,255,0.06)"}`,
            color: isLoggedIn ? "#b89aff" : "var(--t3)",
            padding: "9px 8px", borderRadius: 8,
            fontSize: 12, fontWeight: 500,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
            transition: "all 0.2s", cursor: "pointer",
          }}>
            {isLoggedIn
              ? <>{copied ? <Check size={12} /> : <Copy size={12} />}{copied ? "Copied!" : "Copy Contact"}</>
              : <><Lock size={11} /> Login to Copy</>
            }
          </button>

          {lead.phone && isLoggedIn && (
            <a
              href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noreferrer"
              style={{
                background: "rgba(37,211,102,0.08)",
                border: "1px solid rgba(37,211,102,0.2)",
                color: "#25d366",
                padding: "9px 12px",
                borderRadius: 8,
                fontSize: 13,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
                transition: "all 0.2s",
                flexShrink: 0,
              }}
              title="Message on WhatsApp"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </a>
          )}

          <button onClick={saveCard} style={{
            background: saved ? "rgba(255,209,102,0.08)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${saved ? "rgba(255,209,102,0.25)" : "rgba(255,255,255,0.06)"}`,
            color: saved ? "#ffd166" : "var(--t3)",
            padding: "9px 12px", borderRadius: 8, fontSize: 14, transition: "all 0.2s",
          }}>
            {saved ? "★" : "☆"}
          </button>
        </div>
      </div>

      <style>{`@keyframes cardIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </>
  );
}

// ── Badge style helper ────────────────────────────────────────────────────────
function badge(color, isNeon = false) {
  return {
    display: "flex", alignItems: "center", gap: 4,
    padding: "5px 11px", borderRadius: 7,
    fontSize: 11, fontWeight: 600, textDecoration: "none",
    background: `${color}15`,
    color: isNeon ? "#00ffc8" : color,
    border: `1px solid ${color}30`,
    transition: "all 0.2s", cursor: "pointer",
  };
}

// ── Inline SVG icons ──────────────────────────────────────────────────────────
function MapsIcon() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>;
}
function IgIcon() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>;
}
function LiIcon() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>;
}
function FbIcon() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>;
}
