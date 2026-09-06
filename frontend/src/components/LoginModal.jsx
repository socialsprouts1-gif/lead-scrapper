import { useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function LoginModal({ onClose, reason }) {
  const { loginWithGoogle } = useAuth();
  const googleBtnRef = useRef(null);

  useEffect(() => {
    // Load Google Identity Services script
    const scriptId = "google-gsi-script";
    const existing = document.getElementById(scriptId);

    const initGoogle = () => {
      if (!window.google) return;
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: (credentialResponse) => {
          loginWithGoogle(credentialResponse);
          onClose();
        },
        auto_select: false,
        cancel_on_tap_outside: false,
      });

      // Render the official Google button
      if (googleBtnRef.current) {
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: "filled_black",
          size: "large",
          shape: "pill",
          text: "signin_with",
          logo_alignment: "left",
          width: 280,
        });
      }
    };

    if (existing) {
      initGoogle();
    } else {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = initGoogle;
      document.head.appendChild(script);
    }
  }, []);

  // Close on backdrop click
  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: "fixed", inset: 0, zIndex: 400,
        background: "rgba(7,7,13,0.88)",
        backdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div style={{
        background: "#11111e",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 24,
        padding: "40px 36px",
        width: "100%", maxWidth: 420,
        textAlign: "center",
        boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(124,111,255,0.12)",
        animation: "slideUp 0.25s ease",
        position: "relative",
      }}>
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 16, right: 16,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#8888aa", borderRadius: 8,
            width: 32, height: 32,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, cursor: "pointer",
            transition: "all 0.2s",
          }}
        >×</button>

        {/* Icon */}
        <div style={{
          width: 64, height: 64, borderRadius: 16, margin: "0 auto 20px",
          background: "linear-gradient(135deg,rgba(124,111,255,0.2),rgba(69,212,250,0.15))",
          border: "1px solid rgba(124,111,255,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28,
        }}>🔐</div>

        {/* Title */}
        <h2 style={{
          fontFamily: "Syne, sans-serif", fontSize: 22, fontWeight: 700,
          marginBottom: 10, letterSpacing: "-0.3px",
        }}>
          Sign in to view details
        </h2>

        {/* Reason / description */}
        <p style={{
          fontSize: 14, color: "#8888aa", lineHeight: 1.65, marginBottom: 28,
        }}>
          {reason || "Sign in with your Google account to see the full address, phone number, social profiles, and website of this business."}
        </p>

        {/* What they get after login */}
        <div style={{
          background: "rgba(0,255,200,0.04)",
          border: "1px solid rgba(0,255,200,0.12)",
          borderRadius: 12, padding: "14px 18px",
          marginBottom: 28, textAlign: "left",
        }}>
          {[
            "📍 Full address & location",
            "📞 Phone number",
            "📸 Instagram profile link",
            "💼 LinkedIn profile link",
            "🌐 Official website",
            "📋 Copy & save contacts",
          ].map((item) => (
            <div key={item} style={{
              fontSize: 13, color: "#00ffc8", padding: "4px 0",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              {item}
            </div>
          ))}
        </div>

        {/* Google Sign In Button */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <div ref={googleBtnRef} />
        </div>

        <p style={{ fontSize: 11, color: "#44445a", lineHeight: 1.6 }}>
          We only use your Google account to verify your identity.<br/>
          We never post, read your emails, or share your data.
        </p>
      </div>

      <style>{`
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}
