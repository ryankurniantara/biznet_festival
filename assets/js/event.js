import { getEvents } from "./api/home-api.js";

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

  const eventList = document.getElementById("event-list");
  const pastEventList = document.getElementById("past-event-list");
  if (!eventList) return;

  let pagination = document.getElementById("pagination");
  if (!pagination) {
    pagination = document.createElement("nav");
    pagination.id = "pagination";
    pagination.className = "pagination";
    eventList.insertAdjacentElement("afterend", pagination);
  }

  // Setup past events pagination
  let pastPagination = null;
  if (pastEventList) {
    pastPagination = document.getElementById("past-pagination");
    if (!pastPagination) {
      pastPagination = document.createElement("nav");
      pastPagination.id = "past-pagination";
      pastPagination.className = "pagination";
      pastEventList.insertAdjacentElement("afterend", pastPagination);
    }
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

  // ---- Events (client-side pagination for upcoming and past events) ----
  let currentPage = 1;
  let totalPages = 1;
  let pastCurrentPage = 1;
  let pastTotalPages = 1;
  let activeYear = DEFAULT_YEAR;
  let isLoading = false;
  let eventsController = null;
  let allUpcomingEvents = []; // Store all upcoming events for client-side pagination
  let allPastEvents = []; // Store all past events for client-side pagination
  let allEventsCache = []; // Cache all events to avoid re-fetching
  let yearFilterPopulated = false; // Flag to prevent re-populating year filter

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
      "Jul",
      "Agu",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ];
    return `${dd} ${month[m - 1]} ${y}`;
  };

  // Filter untuk mendapatkan hanya upcoming events (dari hari ini ke depan)
  function filterUpcomingEvents(events = []) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set ke awal hari untuk perbandingan yang tepat
    
    return events.filter(event => {
      const eventDateStr = event.eventdate || event.date;
      if (!eventDateStr) return false;
      
      // Parse tanggal event
      const eventDate = new Date(eventDateStr);
      eventDate.setHours(0, 0, 0, 0);
      
      // Hanya ambil event yang tanggalnya >= hari ini
      return eventDate >= today;
    });
  }

  // Filter untuk mendapatkan hanya past events (sebelum hari ini)
  function filterPastEvents(events = []) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set ke awal hari untuk perbandingan yang tepat
    
    return events.filter(event => {
      const eventDateStr = event.eventdate || event.date;
      if (!eventDateStr) return false;
      
      // Parse tanggal event
      const eventDate = new Date(eventDateStr);
      eventDate.setHours(0, 0, 0, 0);
      
      // Hanya ambil event yang tanggalnya < hari ini
      return eventDate < today;
    });
  }

  // Extract unique years from events data
  function extractAvailableYears(events = []) {
    const years = new Set();
    
    events.forEach(event => {
      const eventDateStr = event.eventdate || event.date;
      if (eventDateStr) {
        const eventDate = new Date(eventDateStr);
        if (!isNaN(eventDate.getTime())) {
          years.add(eventDate.getFullYear());
        }
      }
    });
    
    // Convert to array and sort in descending order (newest first)
    return Array.from(years).sort((a, b) => b - a);
  }

  // Populate year filter dropdown with available years
  function populateYearFilter(availableYears) {
    const yearFilter = document.getElementById("year-filter");
    if (!yearFilter) return;
    
    // Clear existing options except "Semua Tahun"
    yearFilter.innerHTML = '<option value="">Semua Tahun</option>';
    
    // Add available years as options
    availableYears.forEach(year => {
      const option = document.createElement('option');
      option.value = year;
      option.textContent = year;
      
      // Set current year as selected by default
      if (year.toString() === DEFAULT_YEAR) {
        option.selected = true;
        activeYear = year.toString();
      }
      
      yearFilter.appendChild(option);
    });
    
    console.log("Year filter populated with years:", availableYears);
  }

  // Load all events and filter for upcoming and past ones
  async function loadAllEvents() {
    if (isLoading) return;
    
    if (eventsController) eventsController.abort();
    eventsController = new AbortController();
    isLoading = true;

    try {
      await withLoader(eventList, async () => {
        // Only fetch from API if cache is empty or if we need to refresh
        if (allEventsCache.length === 0) {
          const { items: allItems } = await getEvents({
            page: 1,
            pageSize: 1000, // Get a large number to capture all events
            signal: eventsController.signal,
          });
          allEventsCache = allItems || [];
        }
        
        // Extract and populate available years (only do this once)
        if (!yearFilterPopulated && allEventsCache.length > 0) {
          const availableYears = extractAvailableYears(allEventsCache);
          populateYearFilter(availableYears);
          yearFilterPopulated = true;
        }
        
        // Filter by selected year if one is chosen
        let filteredItems = allEventsCache;
        if (activeYear) {
          filteredItems = allEventsCache.filter(event => {
            const eventDateStr = event.eventdate || event.date;
            if (!eventDateStr) return false;
            const eventDate = new Date(eventDateStr);
            return eventDate.getFullYear().toString() === activeYear;
          });
        }
        
        // Filter untuk upcoming dan past events
        allUpcomingEvents = filterUpcomingEvents(filteredItems);
        allPastEvents = filterPastEvents(filteredItems);
        
        // Calculate pagination for both filtered data sets
        totalPages = Math.ceil(allUpcomingEvents.length / PAGE_SIZE);
        pastTotalPages = Math.ceil(allPastEvents.length / PAGE_SIZE);
        currentPage = 1; // Reset to first page
        pastCurrentPage = 1; // Reset to first page
        
        // Render first page of both upcoming and past events
        renderCurrentPage();
        renderPastCurrentPage();
        buildPagination(totalPages, currentPage);
        buildPastPagination(pastTotalPages, pastCurrentPage);
      });
    } catch (e) {
      if (e.name !== "AbortError") {
        console.error(e);
        eventList.innerHTML = `<p class="no-data">Gagal memuat event.</p>`;
        if (pastEventList) pastEventList.innerHTML = `<p class="no-data">Gagal memuat event.</p>`;
        pagination.innerHTML = "";
      }
    } finally {
      isLoading = false;
    }
  }

  // Render current page from filtered upcoming events
  function renderCurrentPage() {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
    const eventsToShow = allUpcomingEvents.slice(startIndex, endIndex);
    renderEvents(eventsToShow, eventList, "Belum ada event yang akan datang.");
  }

  // Render current page from filtered past events
  function renderPastCurrentPage() {
    if (!pastEventList) return;
    
    const startIndex = (pastCurrentPage - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
    const eventsToShow = allPastEvents.slice(startIndex, endIndex);
    renderEvents(eventsToShow, pastEventList, "Belum ada event yang telah berlalu.");
  }

  // Navigate to specific page (client-side)
  function goToPage(page) {
    if (isLoading) return;
    const target = Math.max(1, Math.min(page, totalPages || 1));
    
    if (target === currentPage) return;
    
    currentPage = target;
    renderCurrentPage();
    buildPagination(totalPages, currentPage);
    eventList.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Navigate to specific past events page (client-side)
  function goToPastPage(page) {
    if (isLoading) return;
    const target = Math.max(1, Math.min(page, pastTotalPages || 1));
    
    if (target === pastCurrentPage) return;
    
    pastCurrentPage = target;
    renderPastCurrentPage();
    buildPastPagination(pastTotalPages, pastCurrentPage);
    if (pastEventList) pastEventList.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderEvents(items = [], targetContainer = eventList, noDataMessage = "Belum ada event.") {
    targetContainer.innerHTML = "";
    if (!items.length) {
      targetContainer.innerHTML = `<p class="no-data">${noDataMessage}</p>`;
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
      targetContainer.appendChild(card);
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

  function buildPastPagination(totalPages, currentPage) {
    if (!pastPagination) return;
    
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
    pastPagination.innerHTML = `
      <button class="nav-btn" data-action="prev" ${prevDisabled} aria-label="Sebelumnya">&laquo;</button>
      ${pagesHtml}
      <button class="nav-btn" data-action="next" ${nextDisabled} aria-label="Berikutnya">&raquo;</button>`;
  }

  pagination.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn || isLoading) return;
    
    const action = btn.dataset.action;
    if (action === "prev") return goToPage(currentPage - 1);
    if (action === "next") return goToPage(currentPage + 1);
    
    const page = parseInt(btn.dataset.page, 10);
    if (!Number.isNaN(page)) goToPage(page);
  });

  // Past events pagination event listener
  if (pastPagination) {
    pastPagination.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn || isLoading) return;
      
      const action = btn.dataset.action;
      if (action === "prev") return goToPastPage(pastCurrentPage - 1);
      if (action === "next") return goToPastPage(pastCurrentPage + 1);
      
      const page = parseInt(btn.dataset.page, 10);
      if (!Number.isNaN(page)) goToPastPage(page);
    });
  }

  // Setup filter event listeners
  function setupFilters() {
    // Year filter
    const yearFilter = document.getElementById("year-filter");
    if (yearFilter) {
      yearFilter.addEventListener('change', async (e) => {
        activeYear = e.target.value || DEFAULT_YEAR;
        console.log("Year filter changed to:", activeYear);
        await loadAllEvents();
      });
    }

    // Month filter - existing month input
    const monthFilter = document.getElementById("filter-month");
    if (monthFilter) {
      monthFilter.addEventListener('change', async (e) => {
        const selectedDate = e.target.value; // YYYY-MM format
        if (selectedDate) {
          const [year, month] = selectedDate.split('-');
          activeYear = year;
          if (yearFilter) yearFilter.value = year;
          console.log("Month filter changed - Year:", year, "Month:", month);
        }
        await loadAllEvents();
      });
    }

    // Handle the "Semua" (clear) button
    const calClear = document.getElementById("cal-clear");
    if (calClear) {
      calClear.addEventListener('click', async () => {
        if (monthFilter) monthFilter.value = "";
        console.log("Filter cleared");
        await loadAllEvents();
      });
    }
  }

  // Initialize filters
  setupFilters();

  // Pertama kali: load semua events (upcoming dan past)
  loadAllEvents();
});
