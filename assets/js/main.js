import { getEvents, getProfile } from "./api/home-api.js";

/* =========================================================
   Loader dengan reference-count (aman untuk paralel tasks)
   ========================================================= */
let __loaderCount = 0;
function showLoader() {
  const el = document.getElementById("loader-overlay");
  if (!el) return;
  __loaderCount++;
  el.classList.add("is-open");
  el.hidden = false;
}
function hideLoader() {
  const el = document.getElementById("loader-overlay");
  if (!el) return;
  __loaderCount = Math.max(0, __loaderCount - 1);
  if (__loaderCount === 0) {
    el.classList.remove("is-open");
    el.hidden = true;
  }
}

// Util umum: jalankan task dengan loader + aria-busy
async function withLoader(targetEl, task) {
  try {
    if (targetEl) targetEl.setAttribute("aria-busy", "true");
    showLoader();
    return await task();
  } finally {
    if (targetEl) targetEl.removeAttribute("aria-busy");
    hideLoader();
  }
}

/* =========================================================
   Tunggu auth siap (khusus saat first load dengan ?code)
   - resolve cepat jika window.__authReady === true
   - atau saat menerima event "auth:ready"
   - fallback timeout agar UI tidak nunggu selamanya
   ========================================================= */
function waitAuthReady({ timeoutMs = 2000 } = {}) {
  return new Promise((resolve) => {
    if (window.__authReady === true) return resolve();

    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        window.removeEventListener("auth:ready", onReady);
        clearTimeout(tid);
        resolve();
      }
    };
    const onReady = () => finish();
    window.addEventListener("auth:ready", onReady, { once: true });

    const tid = setTimeout(finish, timeoutMs);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const PAGE_SIZE = 8;
  const DEFAULT_YEAR = "2025";

  const eventList = document.getElementById("event-list");
  const userNameElem = document.getElementById("username");
  const btnSeeProfile = document.getElementById("btn-profile");
  if (!eventList) return;

  let pagination = document.getElementById("pagination");
  if (!pagination) {
    pagination = document.createElement("nav");
    pagination.id = "pagination";
    pagination.className = "pagination";
    eventList.insertAdjacentElement("afterend", pagination);
  }

  // ---- Profile helpers ----
  const filterNameEmail = (email) => {
    if (!email || typeof email !== "string") return "Guest";
    const at = email.indexOf("@");
    return at === -1 ? email : email.slice(0, at);
  };

  // Jangan cache user – selalu ambil terbaru dari auth.js / localStorage
  async function loadProfile() {
    const user =
      (typeof window.getUser === "function" && window.getUser()) ||
      JSON.parse(localStorage.getItem("visitor_data") || "null");

    if (!user?.status_visitor) {
      if (userNameElem) userNameElem.textContent = "Guest";

      return;
    }

    const p = await getProfile(user.email_crypted);
    const prof = p?.profile || {};
    const statusProfile = user?.status_visitor;
    userNameElem.textContent = statusProfile
      ? prof.name || "Guest"
      : filterNameEmail(prof.email);
    btnSeeProfile.textContent = statusProfile
      ? "Lihat Profil"
      : "Lengkapi Profil";
    btnSeeProfile.onclick = () => {
      window.location.href = "profile.html";
    };
  }

  // ---- Events (server-side) ----
  let currentPage = 1;
  let totalPages = 1;
  let activeYear = DEFAULT_YEAR;
  let isLoading = false;
  let eventsController = null;

  const fmtDate = (iso) => {
    if (!iso) return "";
    const [d] = iso.split(" ");
    const [y, m, dd] = (d || "").split("-").map((x) => parseInt(x, 10));
    if (!y || !m || !dd) return iso;
    const month = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Agu",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ][m - 1];
    return `${dd} ${month} ${y}`;
  };

  // Ambil data page (tanpa render & tanpa loader) → dipakai untuk initial boot
  async function fetchPageData(page, { signal } = {}) {
    const safePage = Math.max(1, Math.min(page, totalPages || 1));
    const { items, meta } = await getEvents({
      page: safePage,
      pageSize: PAGE_SIZE,
      year: activeYear,
      signal, // pastikan getEvents meneruskan ke fetch()
    });
    return { items, meta, safePage };
  }

  function renderEvents(items = []) {
    eventList.innerHTML = "";
    if (!items.length) {
      eventList.innerHTML = `<img src="assets/img/no-data.png" alt="No Events" style="max-width:200px;opacity:0.6;margin-bottom:1rem;" /><p class="no-data">Tidak ada event untuk ditampilkan.</p>`;
      return;
    }
    const frag = document.createDocumentFragment();
    items.forEach((ev) => {
      const id = ev.eventid ?? ev.id ?? "";
      const title = ev.eventname ?? ev.title ?? "Untitled Event";
      const date = fmtDate(ev.eventdate ?? ev.date);
      const location = ev.address ?? ev.location ?? "";
      const img = ev.event_image || "assets/img/bifest-list.png";

      const card = document.createElement("div");
      card.classList.add("event-card");
      card.innerHTML = `
        <a href="detail-event.html?id=${encodeURIComponent(
          id
        )}" style="text-decoration:none;color:inherit;">
          <img src="${img}" alt="${title}" width="100%" />
          <div class="event-card-content">
            <h3>${title}</h3>
            <p>${date}</p>
            <p>${location}</p>
          </div>
        </a>`;
      frag.appendChild(card);
    });
    eventList.appendChild(frag);
  }

  function buildPagination(total, current) {
    const prevDisabled = current <= 1 ? "disabled" : "";
    const nextDisabled = current >= total ? "disabled" : "";
    let pagesHtml = "";

    for (let i = 1; i <= total; i++) {
      const isActive = i === current;
      pagesHtml += `
        <button
          class="page-btn ${isActive ? "is-active" : ""}"
          data-page="${i}"
          ${
            isActive
              ? 'disabled aria-current="page" aria-disabled="true"'
              : 'aria-current="false"'
          }
        >
          ${i}
        </button>`;
    }

    pagination.innerHTML = `
      <button class="nav-btn" data-action="prev" ${prevDisabled} aria-label="Sebelumnya">&laquo;</button>
      ${pagesHtml}
      <button class="nav-btn" data-action="next" ${nextDisabled} aria-label="Berikutnya">&raquo;</button>`;
  }

  // Load page (untuk interaksi pagination) → dibungkus loader sendiri
  async function loadPage(page) {
    if (isLoading) return; // cegah spam click
    if (eventsController) eventsController.abort();
    eventsController = new AbortController();
    isLoading = true;
    pagination.classList.add("is-disabled");

    try {
      await withLoader(eventList, async () => {
        const { items, meta, safePage } = await fetchPageData(page, {
          signal: eventsController.signal,
        });
        renderEvents(items);
        currentPage = meta.currentPage || safePage;
        totalPages = meta.totalPages || 1;
        buildPagination(totalPages, currentPage);
        eventList.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (e) {
      if (e.name !== "AbortError") {
        console.error(e);
        eventList.innerHTML = `<p class="no-data">Gagal memuat event.</p>`;
        pagination.innerHTML = "";
      }
    } finally {
      isLoading = false;
      pagination.classList.remove("is-disabled");
    }
  }

  // Listener klik pagination: abaikan klik tombol disabled/halaman aktif
  pagination.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn || isLoading || pagination.classList.contains("is-disabled"))
      return;

    // kalau tombol disabled (termasuk page yang aktif) → abaikan
    if (btn.disabled) return;

    const action = btn.dataset.action;
    if (action === "prev") return loadPage(currentPage - 1);
    if (action === "next") return loadPage(currentPage + 1);

    const page = parseInt(btn.dataset.page, 10);
    // kalau page sama dengan currentPage → abaikan
    if (Number.isNaN(page) || page === currentPage) return;

    loadPage(page);
  });

  // (Opsional) auto-refresh nama bila profil diupdate oleh auth.js
  window.addEventListener("auth:updated", () => {
    loadProfile().catch((err) => console.warn("Profil update fail:", err));
  });

  /* =========================================================
     INITIAL BOOT:
     - Tunggu auth siap (khusus kunjungan dengan ?code)
     - Satu payung withLoader untuk profile + events sekaligus
     ========================================================= */
  (async function init() {
    // PENTING: tampilkan loader saat menunggu auth siap
    await withLoader(eventList, async () => {
      await waitAuthReady({ timeoutMs: 2000 });

      if (eventsController) eventsController.abort();
      eventsController = new AbortController();

      const [pageRes] = await Promise.all([
        fetchPageData(1, { signal: eventsController.signal }),
        loadProfile().catch((err) => {
          console.warn("Gagal memuat profil:", err);
        }),
      ]);

      renderEvents(pageRes.items);
      currentPage = pageRes.meta.currentPage || pageRes.safePage || 1;
      totalPages = pageRes.meta.totalPages || 1;
      buildPagination(totalPages, currentPage);
    });
  })();
});
