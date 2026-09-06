import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

// Uses Google Identity Services (GSI) — no Firebase, no extra library.
// Add your Google Client ID to frontend/.env as VITE_GOOGLE_CLIENT_ID

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);  // { name, email, picture, sub }
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on page load
  useEffect(() => {
    const stored = localStorage.getItem("lf_user");
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch (_) {}
    }
    setLoading(false);
  }, []);

  // Called by LoginModal after Google returns a credential JWT
  const loginWithGoogle = (credentialResponse) => {
    // Decode the JWT payload (base64 — no library needed)
    const base64Payload = credentialResponse.credential.split(".")[1];
    const payload = JSON.parse(atob(base64Payload));

    const userData = {
      name:    payload.name,
      email:   payload.email,
      picture: payload.picture,
      sub:     payload.sub,   // Google unique user ID
    };

    setUser(userData);
    localStorage.setItem("lf_user", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("lf_user");
    if (window.google?.accounts?.id) {
      window.google.accounts.id.disableAutoSelect();
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
