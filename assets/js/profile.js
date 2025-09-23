import { getProfile } from "../js/api/home-api.js";

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

// Helper aman set text
function setText(id, value, fallback = "-") {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value ?? fallback;
}

document.addEventListener("DOMContentLoaded", async function () {
  showLoader(); // ⬅️ tampilkan loader saat mulai memuat data
  getProfile(JSON.parse(localStorage.getItem("visitor_data"))?.email_crypted)
    .then((profile) => {
      const dataProfile = profile.profile;
      console.log("User profile:", dataProfile);
      setText("username", dataProfile.name);
      setText("email", dataProfile.email);
      setText("full-name", dataProfile.name);
      setText("id-card", dataProfile.identityno);
      setText("birth-date", dataProfile.birthdate);
      setText("address", dataProfile.address);
      setText("province", dataProfile.province_name);
      setText("city", dataProfile.city_name);
      setText("district", dataProfile.district_name);
      setText("subdistrict", dataProfile.subdistrict_name);
    })
    .catch((error) => {
      console.error("Error fetching profile:", error);
    })

    .finally(() => {
      console.log("Finished fetching profile");
      hideLoader(); // ⬅️ sembunyikan loader setelah data dimuat
    });
});
