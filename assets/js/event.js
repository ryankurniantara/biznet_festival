document.addEventListener("DOMContentLoaded", () => {
  (async function () {
    // Load events
    const events = await API.getEvents();
    const upcomingList = document.getElementById("event-list");
    const pastList = document.getElementById("past-event-list");

    events.forEach((ev) => {
      const card = document.createElement("div");
      card.classList.add("event-card");
      card.innerHTML = `
        <a href="detail-event.html?id=${ev.id}" style="text-decoration: none; color: inherit;">
          <img src="assets/img/bifest-list.png" alt="${ev.title}" width="100%" />
          <div class="event-card-content">
            <h3>${ev.title}</h3>
            <p>${ev.date}</p>
            <p>${ev.location}</p>
          </div>
        </a>
    `;
      upcomingList.appendChild(card);
      pastList.appendChild(card.cloneNode(true));
    });
  })();

  // YEAR-ONLY FILTER
  (function () {
    const btn = document.getElementById("btn-date");
    const label = document.getElementById("btn-date-label");
    const yearI = document.getElementById("filter-year");
    const list = document.querySelector(".event-list");
    if (!btn || !label || !yearI || !list) return;

    const cards = Array.from(list.querySelectorAll(".event-card"));

    // fallback parse "1 Oktober 2025" -> YYYY-MM-DD (kalau data-date gak ada)
    const map = {
      januari: 1,
      februari: 2,
      maret: 3,
      april: 4,
      mei: 5,
      juni: 6,
      juli: 7,
      agustus: 8,
      september: 9,
      oktober: 10,
      november: 11,
      desember: 12,
    };
    cards.forEach((card) => {
      if (card.dataset.date) return;
      const t = (card.textContent || "").toLowerCase();
      const m = t.match(/(\d{1,2})\s+([a-z]+)\s+(20\d{2})/i);
      if (m) {
        const d = String(m[1]).padStart(2, "0");
        const mo = String(map[(m[2] || "").toLowerCase()] || 1).padStart(
          2,
          "0"
        );
        card.dataset.date = `${m[3]}-${mo}-${d}`;
      }
    });

    function apply() {
      const y = (yearI.value || "").toString().slice(0, 4);
      cards.forEach((c) => {
        const iso = c.dataset.date || "";
        c.style.display = !y || iso.slice(0, 4) === y ? "" : "none";
      });
      label.textContent = y || "Pilih Tahun";
    }

    // buka input tahun saat tombol diklik
    btn.addEventListener("click", () => yearI.focus());

    // jaga agar hanya 4 digit, auto-apply
    yearI.addEventListener("input", () => {
      yearI.value = yearI.value.replace(/[^\d]/g, "").slice(0, 4);
      apply();
    });

    // reset
    document.getElementById("btn-clear")?.addEventListener("click", () => {
      yearI.value = "";
      apply();
    });

    // init
    apply();
  })();
});
