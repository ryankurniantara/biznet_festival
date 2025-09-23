/* auth.js (once-only store) — save token + profile
- Hanya POST /store-email-to-session sekali:
  * ada ?code=...
  * localStorage masih kosong (opsional: strict)
  * belum pernah diproses di sesi/tab ini (sessionStorage flag)
- Guard halaman terproteksi → cek /get-session-all
- Simpan juga visitor_data dari endpoint itu
- Expose: window.getToken(), window.getUser(), window.authLogout()
*/

(function () {
  "use strict";

  // --- Konfigurasi ringkas ---
  const TOKEN_KEY = "visitor_token";
  const DATA_KEY = "visitor_data";
  const ENDPOINT_STORE = `http://192.168.134.64:8000/api/festival/store-email-to-session`;
  const ENDPOINT_CHECK = `http://192.168.134.64:8000/api/festival/get-session-all`;
  const ENDPOINT_LOGOUT = `http://192.168.134.64:8000/api/festival/logout`;
  const LOGOUT_PAGE = "logout.html";
  const PROTECTED_PAGES = [
    "index.html",
    "profile.html",
    "edit-profile.html",
    "event.html",
    "detail-event.html",
  ];

  // Jika ingin memastikan localStorage SEPENUHNYA kosong,
  // set true (default false agar tidak mengganggu key lain).
  const STRICT_EMPTY_CHECK = false;

  // --- Util kecil ---
  const log = (...a) => console.log("[AUTH]", ...a);
  const page = () =>
    location.pathname.toLowerCase().split("/").pop() || "index.html";
  const hasCode = () => new URL(location.href).searchParams.get("code");
  const cleanParam = (name) => {
    const u = new URL(location.href);
    if (u.searchParams.has(name)) {
      u.searchParams.delete(name);
      history.replaceState({}, document.title, u.pathname + u.search + u.hash);
    }
  };

  const getToken = () => localStorage.getItem(TOKEN_KEY);
  const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);

  const getUser = () => {
    try {
      return JSON.parse(localStorage.getItem(DATA_KEY) || "null");
    } catch {
      return null;
    }
  };

  // setUser: simpan & broadcast "auth:updated"
  const setUser = (d) => {
    localStorage.setItem(DATA_KEY, JSON.stringify(d || {}));
    try {
      window.dispatchEvent(
        new CustomEvent("auth:updated", { detail: d || {} })
      );
    } catch {}
  };

  const clearAll = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(DATA_KEY);
  };

  const redirectLogout = (reason) => {
    const u = new URL(location.href);
    u.searchParams.set("reason", reason || "unknown");
    location.href = LOGOUT_PAGE + "?" + u.searchParams.toString();
  };

  const normalizeUser = (payload) =>
    (payload && (payload.visitor_data || payload.data || payload.user)) || null;

  // Tandai siap & broadcast "auth:ready"
  function announceAuthReady() {
    try {
      window.__authReady = true;
      window.dispatchEvent(
        new CustomEvent("auth:ready", { detail: getUser() })
      );
    } catch {}
  }

  // Cek apakah LS kosong sesuai aturan yang diminta
  function isLocalStorageConsideredEmpty() {
    const noAuthKeys = !getToken() && !localStorage.getItem(DATA_KEY);
    if (!noAuthKeys) return false;
    if (STRICT_EMPTY_CHECK) {
      return localStorage.length === 0;
    }
    return true; // longgar: cukup pastikan token & data belum ada
  }

  // --- Step 1: kalau ada ?code → tukar token & simpan (ONCE ONLY) ---
  async function handleCodeIfAnyOnce() {
    const code = hasCode();
    if (!code) return;

    // 1) Harus belum ada auth key di LS (minimal token/data)
    if (!isLocalStorageConsideredEmpty()) {
      log("Skip store: LS sudah terisi (token/data atau key lain).");
      cleanParam("code");
      return;
    }

    // 2) Cegah duplikasi di tab/sesi yang sama
    const FLAG_KEY = "auth_store_code_handled";
    const handledCode = sessionStorage.getItem(FLAG_KEY);
    if (handledCode && handledCode === String(code)) {
      log("Skip store: kode ini sudah diproses di sesi ini.");
      cleanParam("code");
      return;
    }

    // Tandai akan diproses
    sessionStorage.setItem(FLAG_KEY, String(code));

    try {
      const resp = await fetch(ENDPOINT_STORE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encrypted_email: code }),
      });
      const data = await resp.json();

      if (data && data.status) {
        if (data.token) setToken(data.token);
        const user = normalizeUser(data);
        if (user) setUser(user);
        log("Authenticated via code (once). Token & profile saved.");
        cleanParam("code");

        // -> Beritahu halaman lain kalau auth siap
        announceAuthReady();
      } else {
        log("Auth via code failed:", data && data.message);
        sessionStorage.removeItem(FLAG_KEY);
        clearAll();
        cleanParam("code");
        redirectLogout("auth_failed");
      }
    } catch (e) {
      log("Auth via code error:", e);
      sessionStorage.removeItem(FLAG_KEY);
      clearAll();
      cleanParam("code");
      redirectLogout("auth_network_error");
    }
  }

  // --- Step 2: cek validitas sesi (dipakai guard) ---
  async function isSessionValidAndRefreshProfile() {
    const token = getToken();
    if (!token) return false;

    try {
      const resp = await fetch(ENDPOINT_CHECK, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      console.log("Token check response:", token);
      if (resp.status === 401) return false;

      const data = await resp.json();
      if (data && data.authenticated) {
        const user = normalizeUser(data);
        if (user) setUser(user);

        // -> Auth siap (berguna saat masuk tanpa ?code)
        announceAuthReady();

        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  // --- Step 3: guard halaman terproteksi ---
  async function guard() {
    const current = page();
    const protectedPage = PROTECTED_PAGES.includes(current) || current === "";
    if (!protectedPage) return;

    const ok = await isSessionValidAndRefreshProfile();
    if (!ok) {
      clearAll();
      redirectLogout("no_or_invalid_token");
    }
  }

  // --- Logout sederhana (opsional dipanggil dari tombol) ---
  async function logout() {
    const token = getToken();
    try {
      if (token) {
        await fetch(ENDPOINT_LOGOUT, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
      }
    } finally {
      clearAll();
      redirectLogout("manual_logout");
    }
  }

  // --- Boot urut: proses code (once) → guard ---
  (async function init() {
    try {
      if (hasCode()) await handleCodeIfAnyOnce();
      await guard();
    } catch (e) {
      log("Init error:", e);
      await guard(); // fallback tetap jaga halaman
    }
  })();

  // --- expose minimal API ke luar ---
  window.getToken = getToken; // ambil token cepat
  window.getUser = getUser; // ambil data user tersimpan
  window.authLogout = logout; // logout manual
})();
