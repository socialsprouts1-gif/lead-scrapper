import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./pages/HomePage";
import AdminPage from "./pages/AdminPage";
import Navbar from "./components/Navbar";
import { useAuth } from "./contexts/AuthContext";
import { logVisit } from "./services/api";

export default function App() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    const name = user?.name || "Guest";
    const email = user?.email || null;
    logVisit(name, email);
  }, [user, loading]);

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/admin"
          element={
            loading ? (
              <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--t2)" }}>
                Checking authentication...
              </div>
            ) : user?.email === "hardiksedani2610@gmail.com" ? (
              <AdminPage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
      </Routes>
    </>
  );
}
