// assets/js/detail-event.js
import {
  fetchEventDetails,
  registerForEvent,
  schSendEmailQR,
} from "./api/detail-event-api.js";
import { filterDateTime } from "./utils/date-time-format.js";
import { getProfile } from "./api/home-api.js";

document.addEventListener("DOMContentLoaded", () => {
  /* =========================
   Loader helpers
   ========================= */
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

  /* =========================
   State
   ========================= */
  let currentEvent = {}; // simpan detail event yang aktif
  let isRegistering = false; // anti double-submit
  let dataQrCode = null; // cache QR code jika perlu

  // Render Detail Kompetisi
  function renderDetailKompetisi(raw = [], isRegist = false) {
    const wrap = document.getElementById("event-competitions");
    if (!wrap) return;

    wrap.className = "comp-cards";

    const data = Array.isArray(raw)
      ? raw
      : typeof raw === "string"
      ? JSON.parse(raw || "[]")
      : [];

    wrap.innerHTML = "";

    if (data.length === 0) {
      wrap.innerHTML = "<p style='text-align:center'>Tidak ada kompetisi.</p>";
      return;
    }

    data.forEach((item, idx) => {
      // sumber data
      const title =
        item.competitionName || item.title || `Kompetisi ${idx + 1}`;
      const img = item.imageEvent || item.banner || "";
      // fallback tanggal/lokasi pakai detail event utama bila per-kompetisi tidak ada
      const date =
        item.date ||
        item.eventDate ||
        currentEvent?.date ||
        currentEvent?.event_date ||
        "";
      const loc =
        item.location || currentEvent?.location || currentEvent?.address || "";

      console.log("IsRegist:", isRegist);

      const card = document.createElement("article");
      card.className = "simp-card";
      card.innerHTML = `
      ${img ? `<img class="simp-card__img" src="${img}" alt="${title}">` : ""}
      <div class="simp-card__body">
        <h4 class="simp-card__title">${title}</h4>
        ${date ? `<p class="simp-card__meta">${formatDate(date)}</p>` : ""}
        ${loc ? `<p class="simp-card__meta">${loc}</p>` : ""}
      </div>
    `;

      // klik kartu = buka detail (modal)
      card.addEventListener("click", () => {
        const html = `
        <div style="text-align:left">
          <h3 style="margin:0 0 8px">${title}</h3>
          ${
            img
              ? `<img src="${img}" style="width:100%;border-radius:12px;margin:8px 0 12px">`
              : ""
          }
          ${item.detailCompetition || "-"}
          ${
            item.termAndCondition
              ? `<hr style="margin:12px 0;opacity:.25" /><div><strong>S&K</strong><br>${item.termAndCondition}</div>`
              : ""
          }
        </div>`;
        if (item.qrStatusCompetition) {
          const qrImgCompetition = item.qrImageCompetition;
          Swal.fire({
            title:
              "<strong> Anda Sudah Terdaftar • Kode QR Competition</strong>",
            html: qrImgCompetition ?? "QR Code tidak tersedia.",
            imageAlt: "QR Code Untuk Event Ini",
            showCloseButton: true,
            confirmButtonText: "Tutup",
          });
        } else {
          Swal.fire({
            title: "Detail Kompetisi",
            html,
            width: 720,
            confirmButtonText: "Daftar", // ganti tulisan tombol
            showCancelButton: true, // opsional: bisa tambahin tombol batal
            cancelButtonText: "Tutup",
          }).then((result) => {
            if (result.isConfirmed) {
              // arahkan ke halaman form
              console.log("Sudah Regist?", isRegist);
              // Kalau sudah daftar event dia bisa daftar kompetisi
              if (isRegist) {
                // Kirim respon json field ke halaman form-competition
                const transferData = item || {};

                // Kirim data diatas menggunakan sessionStorage
                sessionStorage.setItem(
                  "detailEvent",
                  JSON.stringify(transferData)
                );
                // Arahkan ke halaman form-competition
                window.location.href = "form-competition.html";
              } else {
                Swal.fire(
                  "Perhatian",
                  "Silakan daftar event terlebih dahulu sebelum mendaftar kompetisi.",
                  "info"
                );
              }
            }
          });
        }
      });

      wrap.appendChild(card);
    });

    // helper tanggal singkat (gunakan util kamu kalau mau)
    function formatDate(x) {
      try {
        const d = new Date(x);
        const opt = { day: "2-digit", month: "short", year: "numeric" };
        return d.toLocaleDateString("id-ID", opt).replace(".", "");
      } catch {
        return x;
      }
    }
  }

  // start
  loadEventDetails().catch((e) => {
    console.error(e);
    hideLoader();
  });

  /* =========================
   Load detail event
   ========================= */
  async function loadEventDetails() {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get("id");
    if (!eventId) return;

    showLoader();
    try {
      const res = await fetchEventDetails(eventId);
      console.log("Event details:", res);
      if (!res || res.status !== true) {
        window.history.back();
        throw new Error("Event not found or invalid response");
        // Balik ke halaman sebelumnya
      }

      const data = res.data || {};

      // Set value ke state
      currentEvent = data;
      dataQrCode = data.qr_image || null;

      // ====== isi konten ======
      const titleEl = document.getElementById("event-title");
      const descEl = document.getElementById("event-description");
      const locEl = document.getElementById("event-location");
      const dateEl = document.getElementById("event-date");
      const timeEl = document.getElementById("event-time");
      const imgEl = document.getElementById("event-image");

      if (titleEl) titleEl.textContent = data.name_event || data.title || "N/A";
      if (descEl)
        descEl.textContent = data.detailEvent || data.description || "N/A";
      if (locEl) locEl.textContent = data.location || data.address || "N/A";

      renderDetailKompetisi(data.competitionEvent || [], data.qrStatusEvent);
      // tanggal & waktu aman
      try {
        const srcDate = data.date || data.event_date || data.eventDate || "";
        const dtDate = filterDateTime(srcDate, { mode: "date" });
        const dtTime = filterDateTime(srcDate, { mode: "time" });
        if (dateEl) dateEl.textContent = (dtDate && dtDate.dateText) || "N/A";
        if (timeEl) timeEl.textContent = (dtTime && dtTime.timeText) || "N/A";
      } catch {
        if (dateEl) dateEl.textContent = "N/A";
        if (timeEl) timeEl.textContent = "N/A";
      }

      if (imgEl && (data.imageEvent || data.event_image)) {
        imgEl.src = data.imageEvent || data.event_image;
        imgEl.alt = (data.name_event || "Event") + " image";
      }

      // ====== tombol daftar & QR ======
      const registerButton = document.querySelector(".button-register");
      const qrCodeButton = document.querySelector(".button-showQrCode");

      // Normalisasi flag QR
      const val = data.qrStatusEvent ?? data.has_qr ?? data.hasQR;
      const hasQR =
        val === true ||
        val === 1 ||
        val === "1" ||
        (typeof val === "string" && val.toLowerCase() === "true");

      if (qrCodeButton) qrCodeButton.hidden = !hasQR;
      if (registerButton) registerButton.hidden = hasQR;

      // Hindari trigger ganda: jika HTML sudah pakai inline onclick="registerEvent()",
      // jangan bind lagi via addEventListener.
      if (
        registerButton &&
        !registerButton.getAttribute("onclick") &&
        !registerButton.dataset.bound
      ) {
        registerButton.addEventListener("click", registerEvent);
        registerButton.dataset.bound = "1";
      }

      if (
        qrCodeButton &&
        !qrCodeButton.getAttribute("onclick") &&
        !qrCodeButton.dataset.bound
      ) {
        qrCodeButton.addEventListener("click", () => {
          showQrCode(data.qr_image || data.qr || "");
        });
        qrCodeButton.dataset.bound = "1";
      }
    } finally {
      hideLoader();
    }
  }

  /* =========================
   Register Event
   ========================= */
  async function registerEvent(evt) {
    if (evt && typeof evt.preventDefault === "function") evt.preventDefault();

    // Anti double-click
    if (isRegistering) return;

    try {
      const raw = localStorage.getItem("visitor_data");
      const userData = raw ? JSON.parse(raw) : null;

      // Belum punya/kelengkapan profil → tawarkan isi dulu
      if (!userData || !userData.status_visitor) {
        if (window.Swal) {
          const go = await Swal.fire({
            title: "Lengkapi Data",
            text: "Isi data diri terlebih dahulu sebelum mendaftar event.",
            icon: "info",
            showCancelButton: true,
            confirmButtonText: "Isi Sekarang",
            cancelButtonText: "Nanti",
          });
          if (go.isConfirmed) window.location.href = "edit-profile.html";
        } else {
          if (
            confirm("Isi data diri terlebih dahulu. Buka halaman Edit Profil?")
          ) {
            window.location.href = "edit-profile.html";
          }
        }
        return;
      }

      // Konfirmasi sederhana (tanpa detail)
      let proceed = true;
      if (window.Swal) {
        const { isConfirmed } = await Swal.fire({
          title: "Daftar Event?",
          text: "Apakah Anda yakin ingin mendaftar ke event ini?",
          icon: "question",
          showCancelButton: true,
          confirmButtonText: "Ya, Daftar",
          cancelButtonText: "Batal",
          allowOutsideClick: false,
        });
        proceed = isConfirmed;
      } else {
        proceed = confirm("Daftarkan ke event ini?");
      }
      if (!proceed) return;

      // Mulai submit (lock double submit + loading)
      isRegistering = true;
      if (window.Swal) {
        Swal.fire({
          title: "Registrasi...",
          text: "Sedang submit data Anda.",
          allowOutsideClick: false,
          didOpen: () => Swal.showLoading(),
        });
      }

      // Ambil profil SETELAH konfirmasi agar hemat request
      const emailKey =
        userData.email_crypted ??
        userData.emailEncrypted ??
        userData.email ??
        "";
      const profileRes = await getProfile(emailKey);
      const profile = profileRes?.profile || {};

      console.log("User profile:", profile);

      // Normalisasi field event
      const subEventId =
        currentEvent?.subevent_id ??
        currentEvent?.subeventid ??
        currentEvent?.id_subevent ??
        currentEvent?.subEventId ??
        currentEvent?.id;

      const eventDateSrc =
        currentEvent?.date ||
        currentEvent?.event_date ||
        currentEvent?.eventDate ||
        "";

      // Payload
      const payload = {
        name: profile.name || profile.fullname || "",
        gender: profile.gender || profile.sex || "",
        birthdate: profile.birthdate || profile.birth_date || "",
        email: profile.email || "",
        country_code_mobile_no:
          profile.mobilecountrycode || profile.country_code_mobile_no || "",
        mobile_number: profile.mobile || profile.mobile_number || "",
        address: profile.address || "",
        province:
          profile.province_id ??
          profile.province ??
          profile.province_name ??
          "",
        city: profile.city_id ?? profile.city ?? profile.city_name ?? "",
        district:
          profile.district_id ??
          profile.district ??
          profile.district_name ??
          "",
        subdistrict:
          profile.subdistrict_id ??
          profile.subdistrict ??
          profile.subdistrict_name ??
          "",
        identity_type: profile.identitytype || "",
        identity_no: profile.identityno || profile.identity_no || "",
        event_date: eventDateSrc || "",
        subeventid: subEventId || "",
      };

      if (profileRes?.idcust) payload.idcust = profileRes.idcust;
      else if (profile?.idcust) payload.idcust = profile.idcust;

      console.log("Register payload:", payload);

      // Submit ke API
      const regRes = await registerForEvent(payload);
      // Send scheduler to send QR to email
      await schSendEmailQR();

      if (regRes?.status) {
        if (window.Swal) {
          await Swal.fire(
            "Berhasil",
            regRes?.message || "Pendaftaran berhasil.",
            "success"
          );
        }
        window.location.reload();
        return;
      }

      // Gagal
      if (window.Swal) {
        await Swal.fire(
          "Gagal",
          regRes?.message || "Pendaftaran gagal.",
          "error"
        );
      } else {
        alert(regRes?.message || "Pendaftaran gagal.");
      }
    } catch (err) {
      console.error("Register error:", err);
      if (window.Swal) {
        await Swal.fire("Error", err?.message || "Terjadi kesalahan.", "error");
      } else {
        alert(err?.message || "Terjadi kesalahan.");
      }
    } finally {
      if (window.Swal) {
        try {
          Swal.close();
        } catch {}
      }
      isRegistering = false;
    }
  }

  function showQrCode() {
    console.log("Show QR Code:", dataQrCode);
    if (window.Swal) {
      Swal.fire({
        title: "<strong>Kode QR</strong>",
        html: dataQrCode ?? "QR Code tidak tersedia.",
        imageAlt: "QR Code Untuk Event Ini",
        showCloseButton: true,
        confirmButtonText: "Tutup",
      });
    } else {
      if (url) window.open(url, "_blank");
    }
  }

  /* =========================
   (Opsional) expose untuk inline onclick di HTML
   ========================= */
  window.registerEvent = registerEvent;
  window.showQrCode = showQrCode;
});
