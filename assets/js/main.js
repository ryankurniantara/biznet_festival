import { getEvents, getProfile } from "./api/home-api.js";

function showLoader() {
  const el = document.getElementById("loader-overlay");
  if (!el) return;
  el.classList.add("is-open");
  el.hidden = false;
}
function hideLoader() {
  const el = document.getElementById("loader-overlay");
  if (!el) return;
  el.classList.remove("is-open");
  el.hidden = true;
}

// Util umum: jalankan task dengan loader + aria-busy
async function withLoader(targetEl, task) {
  try {
    if (targetEl) targetEl.setAttribute("aria-busy", "true");
    showLoader();
    return await task();
  } finally {
    hideLoader();
    if (targetEl) targetEl.removeAttribute("aria-busy");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const PAGE_SIZE = 8;
  const DEFAULT_YEAR = "2025";
  const user = JSON.parse(localStorage.getItem("visitor_data")) || null;

  const eventList = document.getElementById("event-list");
  const userNameElem = document.getElementById("username");
  if (!eventList) return;

  let pagination = document.getElementById("pagination");
  if (!pagination) {
    pagination = document.createElement("nav");
    pagination.id = "pagination";
    pagination.className = "pagination";
    eventList.insertAdjacentElement("afterend", pagination);
  }

  // ---- Profile (tidak perlu overlay penuh; cukup tanpa loader) ----
  const filterNameEmail = (email) => {
    if (!email || typeof email !== "string") return "Guest";
    const at = email.indexOf("@");
    return at === -1 ? email : email.slice(0, at);
  };
  const isBiodataEmpty = (d = {}) => {
    const fields = [
      "name",
      "gender",
      "birthdate",
      "mobilecountrycode",
      "mobile",
      "address",
      "province_id",
      "province_name",
      "city_id",
      "city_name",
      "district_id",
      "district_name",
      "subdistrict_id",
      "subdistrict_name",
      "identitytype",
      "identityno",
      "profilepicture",
    ];
    return fields.every((k) => d[k] == null || d[k] === "");
  };

  if (user?.email_crypted) {
    getProfile(user.email_crypted)
      .then((p) => {
        const prof = p?.profile || {};
        if (!isBiodataEmpty(prof) && prof.name)
          userNameElem.textContent = prof.name;
        else
          userNameElem.textContent = filterNameEmail(
            prof.email || user?.email || "Guest"
          );
      })
      .catch(
        () =>
          (userNameElem.textContent = filterNameEmail(user?.email || "Guest"))
      );
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

  async function loadPage(page) {
    if (isLoading) return; // cegah spam click
    const target = Math.max(1, Math.min(page, totalPages || 1));

    // batalkan request sebelumnya (kalau user klik cepat)
    if (eventsController) eventsController.abort();
    eventsController = new AbortController();
    isLoading = true;

    // Nonaktifkan tombol selama loading
    pagination.classList.add("is-disabled");

    try {
      await withLoader(eventList, async () => {
        const { items, meta } = await getEvents({
          page: target,
          pageSize: PAGE_SIZE,
          year: activeYear,
          signal: eventsController.signal, // pastikan getEvents meneruskan ke fetch()
        });
        renderEvents(items);
        currentPage = meta.currentPage || target;
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

  function renderEvents(items = []) {
    eventList.innerHTML = "";
    if (!items.length) {
      eventList.innerHTML = `<p class="no-data">Belum ada event.</p>`;
      return;
    }
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
      eventList.appendChild(card);
    });
  }

  function buildPagination(totalPages, currentPage) {
    const prevDisabled = currentPage <= 1 ? "disabled" : "";
    const nextDisabled = currentPage >= totalPages ? "disabled" : "";
    let pagesHtml = "";
    for (let i = 1; i <= totalPages; i++) {
      pagesHtml += `
        <button class="page-btn ${
          i === currentPage ? "is-active" : ""
        }" data-page="${i}" aria-current="${
        i === currentPage ? "page" : "false"
      }">
          ${i}
        </button>`;
    }
    pagination.innerHTML = `
      <button class="nav-btn" data-action="prev" ${prevDisabled} aria-label="Sebelumnya">&laquo;</button>
      ${pagesHtml}
      <button class="nav-btn" data-action="next" ${nextDisabled} aria-label="Berikutnya">&raquo;</button>`;
  }

  pagination.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn || isLoading || pagination.classList.contains("is-disabled"))
      return;
    const action = btn.dataset.action;
    if (action === "prev") return loadPage(currentPage - 1);
    if (action === "next") return loadPage(currentPage + 1);
    const page = parseInt(btn.dataset.page, 10);
    if (!Number.isNaN(page)) loadPage(page);
  });

  // Pertama kali: tampilkan loader saat initial fetch
  loadPage(1);
});
