import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
  // 6 minutes — Apify scraping takes 2-4 minutes to complete
  timeout: 360000,
});

// Search for real businesses via Apify
export async function searchLeads(keyword, city, forceRefresh = false) {
  try {
    let userName = null;
    let userEmail = null;
    try {
      const stored = localStorage.getItem("lf_user");
      if (stored) {
        const u = JSON.parse(stored);
        userName = u.name || null;
        userEmail = u.email || null;
      }
    } catch (_) {}

    const res = await API.post("/api/search", { keyword, city, userName, userEmail, forceRefresh });
    return res.data;
  } catch (err) {
    if (
      err.code === "ECONNABORTED" ||
      err.code === "ERR_NETWORK" ||
      err.message?.includes("timeout") ||
      err.message?.includes("Network Error")
    ) {
      throw new Error(
        "Server is waking up from sleep. Please wait 30 seconds and try again. This only happens on the first search after a long break."
      );
    }
    throw err;
  }
}

// Log general page visit with user details if logged in
export async function logVisit(name, email) {
  try {
    const res = await API.post("/api/visit", { name, email });
    return res.data;
  } catch (err) {
    console.warn("logVisit failed:", err.message);
    return null;
  }
}

// Export results to Excel
export async function exportLeads(results, keyword, city) {
  const res = await API.post(
    "/api/export",
    { results, keyword, city },
    { responseType: "blob", timeout: 30000 }
  );
  const url  = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement("a");
  link.href  = url;
  link.setAttribute("download", `LeadFinder_${keyword}_${city}_${Date.now()}.xlsx`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

// Get analytics
export async function getAnalytics() {
  let email = null;
  try {
    const stored = localStorage.getItem("lf_user");
    if (stored) {
      email = JSON.parse(stored).email;
    }
  } catch (_) {}

  const res = await API.get("/api/analytics", {
    headers: { "x-admin-email": email },
    timeout: 15000,
  });
  return res.data;
}

export default API;
