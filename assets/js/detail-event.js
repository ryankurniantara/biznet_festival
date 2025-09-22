import { fetchEventDetails } from "./api/detail-event-api.js";
import { filterDateTime } from "./utils/date-time-format.js";

document.querySelectorAll(".accordion-header").forEach((header) => {
  header.addEventListener("click", () => {
    const content = header.nextElementSibling;
    header.classList.toggle("active");
    content.classList.toggle("open");
  });
});

function showLoader() {
  const el = document.getElementById("loader-overlay");
  if (!el) return;
  el.classList.add("is-open"); // tampilkan via class
  el.hidden = false; // sinkron dengan atribut
}

function hideLoader() {
  const el = document.getElementById("loader-overlay");
  if (!el) return;
  el.classList.remove("is-open"); // sembunyikan via class
  el.hidden = true; // sinkron dengan atribut
}

document
  .addEventListener("DOMContentLoaded", async function () {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get("id");
    console.log("Fetched event ID:", eventId);

    if (eventId) {
      showLoader();
      const res = await fetchEventDetails(eventId);
      hideLoader();
      console.log("Event details fetched:", res);
      if (res.status) {
        const data = res.data || {};

        document.getElementById("event-title").textContent =
          data.name_event || "N/A";
        document.getElementById("event-description").textContent =
          data.detailEvent || "N/A";
        document.getElementById("event-location").textContent =
          data.location || "N/A";
        document.getElementById("event-date").textContent =
          filterDateTime(data.date, { mode: "date" }).dateText || "N/A";
        document.getElementById("event-time").textContent =
          filterDateTime(data.date, { mode: "time" }).timeText || "N/A";

        if (data.imageEvent) {
          document.getElementById("event-image").src = data.imageEvent;
        }
      } else {
        console.error("Event not found or invalid response");
      }
    } else {
      console.error("No event ID provided in URL");
    }
  })
  .catch((error) => {
    console.error("Error fetching event details:", error);
  });
