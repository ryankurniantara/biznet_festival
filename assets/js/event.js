import { mountYearFilter } from "../js/components/year-filter.js";

document.addEventListener("DOMContentLoaded", () => {
  const yf = YearFilter.mount("#year-filter", {
    initialYear: 2025,
    minYear: 2020,
    maxYear: 2030,
    onChange: (year, prev) => {
      console.log("Year changed:", prev, "→", year);
      // TODO: loadEvents(year);
    },
  });

  // contoh: dengarkan event-nya (opsional)
  document.querySelector("#year-filter").addEventListener("yearchange", (e) => {
    console.log("CustomEvent yearchange:", e.detail.year);
  });

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

  // const yf = YearFilter.mount("#year-filter", {
  //   initialYear: 2025,
  //   minYear: 2020,
  //   maxYear: 2030,
  //   onChange: (year, prev) => {
  //     console.log("Year changed:", prev, "→", year);
  //     // TODO: loadEvents(year);
  //   },
  // });

  // // contoh: dengarkan event-nya (opsional)
  // document.querySelector("#year-filter").addEventListener("yearchange", (e) => {
  //   console.log("CustomEvent yearchange:", e.detail.year);
  // });
  yf.setYear(2024);
});
