// assets/js/form-competition.js
import {
  registerCompetition,
  schSendEmailQRCompetition,
} from "./api/competion-api.js";

document.addEventListener("DOMContentLoaded", function () {
  const mount = document.getElementById("competition-form");
  if (!mount) return;

  // Pastikan jQuery + Validate ada
  const $ = window.jQuery || window.$;
  if (!$ || !$.fn || !$.fn.validate) {
    console.error("jQuery / jQuery Validate belum terpasang.");
    return;
  }

  // ===== Ambil detailEvent dari sessionStorage =====
  let detail = null;
  console.log(detail?.eventid);

  try {
    const raw = sessionStorage.getItem("detailEvent");

    console.log("Mounting competition form...", raw);
    detail = raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error("Gagal parse detailEvent:", e);
  }
  if (!detail) {
    mount.innerHTML = `
      <div style="text-align:center; padding:16px;">
        <p style="margin:0 0 10px; font-weight:600;">Data form tidak ditemukan</p>
        <p style="margin:0; color:#6b7280; font-size:14px;">Silakan kembali ke halaman sebelumnya.</p>
      </div>`;
    return;
  }

  // fields harus object
  const fields = typeof detail.fields === "object" ? detail.fields : null;
  if (!fields) {
    mount.innerHTML = `
      <div style="text-align:center; padding:16px;">
        <p style="margin:0 0 10px; font-weight:600;">Field spesifikasi tidak tersedia</p>
        <p style="margin:0; color:#6b7280; font-size:14px;">Silakan kembali ke halaman sebelumnya.</p>
      </div>`;
    return;
  }

  // Normalisasi flag
  const truthy = (v) => v === 1 || v === "1" || v === true;
  const spec = {
    field_data_diri: truthy(fields.field_data_diri) ? 1 : null,
    field_kartu_pelajar: truthy(fields.field_kartu_pelajar) ? 1 : null,
    field_link_video: truthy(fields.field_link_video) ? 1 : null,

    // single fields
    field_nama_band: truthy(fields.field_nama_band) ? 1 : null,
    field_nama_tim: truthy(fields.field_nama_tim) ? 1 : null,

    // grouped contacts (3 sub-field tiap group)
    field_manager: truthy(fields.field_manager) ? 1 : null,
    field_pelatih: truthy(fields.field_pelatih) ? 1 : null,
    field_orang_tua: truthy(fields.field_orang_tua) ? 1 : null,

    // repeater members
    field_nama_peserta: truthy(fields.field_nama_peserta) ? 1 : null,
    jumlah_peserta: Number.isFinite(+fields.jumlah_peserta)
      ? Math.max(1, +fields.jumlah_peserta)
      : 1,
  };

  renderCompetitionForm(spec, mount, detail);

  // ================= Renderer =================
  function renderCompetitionForm(spec, mount, meta) {
    const compName = meta?.competitionName || meta?.competition || "Kompetisi";
    const subComp = meta?.subCompetitionName || meta?.sub_competition || "";

    mount.innerHTML = `
      <h3 class="section-title">Data ${compName}${
      subComp ? " • " + subComp : ""
    }</h3>
      <p class="section-desc">Isi sesuai ketentuan penyelenggara. Kolom yang tidak diwajibkan tidak akan ditampilkan.</p>
      <form id="compForm" class="grid" novalidate></form>
      <div class="actions">
        <button class="btn" type="submit" form="compForm">Kirim</button>
      </div>
    `;

    const form = mount.querySelector("#compForm");
    const addField = (html, cls = "field") => {
      const wrap = document.createElement("div");
      wrap.className = cls;
      wrap.innerHTML = html;
      form.appendChild(wrap);
      return wrap;
    };
    const show = (v) => v === 1;

    // ---------- Fields statis ----------
    if (show(spec.field_nama_tim)) {
      addField(`
        <label class="label required" for="nama_tim">Nama Tim</label>
        <input id="nama_tim" class="input" name="nama_tim" placeholder="Masukkan nama tim" required>
      `);
    }
    if (show(spec.field_nama_band)) {
      addField(`
        <label class="label required" for="nama_band">Nama Band</label>
        <input id="nama_band" class="input" name="nama_band" placeholder="Masukkan nama band" required>
      `);
    }
    if (show(spec.field_link_video)) {
      addField(
        `
        <label class="label" for="link_video">Link Video</label>
        <input id="link_video" class="input" type="url" name="link_video" placeholder="https://...">
        <div class="hint">Tempel URL video (YouTube/Drive, dsb.).</div>
      `
      );
    }
    if (show(spec.field_kartu_pelajar)) {
      addField(
        `
        <label class="label required" for="kartu_pelajar">No Kartu Pelajar</label>
        <input id="kartu_pelajar" class="input" type="text" name="kartu_pelajar" placeholder="Masukkan nomor kartu pelajar" required>
      `
      );
    }
    if (show(spec.field_data_diri)) {
      addField(
        `
        <label class="label required" for="data_diri">Data Diri Tambahan</label>
        <textarea id="data_diri" class="textarea" name="data_diri" placeholder="Tuliskan info tambahan yang diminta" required></textarea>
      `
      );
    }

    // ---------- Helper: contact group ----------
    function renderContactGroup(title, baseName) {
      const grp = addField(
        `
        <div class="contact-group">
          <div class="cg-head">${title}</div>
          <div class="cg-body">
            <div class="field">
              <label class="label required" for="${baseName}_name">Nama</label>
              <input id="${baseName}_name" class="input" name="${baseName}[name]" placeholder="Nama ${title}" required>
            </div>
            <div class="field">
              <label class="label required" for="${baseName}_email">Email</label>
              <input id="${baseName}_email" class="input" type="email" name="${baseName}[email]" placeholder="Email ${title}" required>
            </div>
            <div class="field">
              <label class="label required" for="${baseName}_phone">No. HP</label>
              <input id="${baseName}_phone" class="input" name="${baseName}[phone]" placeholder="No. HP ${title}" inputmode="numeric" required>
            </div>
          </div>
        </div>
      `,
        "field full"
      );
      return grp;
    }

    if (show(spec.field_manager)) renderContactGroup("Manager", "manager");
    if (show(spec.field_pelatih)) renderContactGroup("Pelatih", "pelatih");
    if (show(spec.field_orang_tua))
      renderContactGroup("Orang Tua / Wali", "orang_tua");

    // ---------- jQuery Validate init & rules (LETakkan SEBELUM repeater!) ----------
    $.validator.addMethod(
      "phoneID",
      function (value) {
        if (value === "") return true;
        return /^[0-9+()\-\s]{8,20}$/.test(value);
      },
      "Nomor HP tidak valid"
    );

    $(form).validate({
      ignore: [],
      errorElement: "label",
      errorClass: "error",
      messages: { link_video: { url: "URL tidak valid" } },
      errorPlacement: function (err, el) {
        err.insertAfter(el);
      },
      highlight: function (el) {
        const host =
          el.closest(".field") ||
          el.closest(".member-card") ||
          el.parentElement;
        if (host) host.classList.add("invalid");
      },
      unhighlight: function (el) {
        const host =
          el.closest(".field") ||
          el.closest(".member-card") ||
          el.parentElement;
        if (host) host.classList.remove("invalid");
      },
    });

    const must = (name, rules) => {
      const $el = $(`[name="${name}"]`);
      if ($el.length) $el.rules("add", rules);
    };
    if (show(spec.field_nama_tim))
      must("nama_tim", {
        required: true,
        messages: { required: "Nama tim wajib diisi" },
      });
    if (show(spec.field_nama_band))
      must("nama_band", {
        required: true,
        messages: { required: "Nama band wajib diisi" },
      });
    if (show(spec.field_link_video)) must("link_video", { url: true });

    [
      ["manager", "Manager"],
      ["pelatih", "Pelatih"],
      ["orang_tua", "Orang Tua / Wali"],
    ].forEach(([base, label]) => {
      if (!show(spec["field_" + base])) return;
      must(`${base}[name]`, {
        required: true,
        messages: { required: `Nama ${label} wajib diisi` },
      });
      must(`${base}[email]`, {
        required: true,
        email: true,
        messages: {
          required: `Email ${label} wajib diisi`,
          email: "Format email tidak valid",
        },
      });
      must(`${base}[phone]`, {
        required: true,
        phoneID: true,
        minlength: 8,
        messages: {
          required: `No. HP ${label} wajib diisi`,
          minlength: "Minimal 8 karakter",
        },
      });
    });

    // ---------- Repeater Member ----------
    if (show(spec.field_nama_peserta)) {
      const limit = Math.max(1, parseInt(spec.jumlah_peserta || 1, 10));
      const wrap = addField(
        `<label class="label required">Anggota Tim / Member (maks ${limit} orang)</label>`,
        "field full"
      );

      const rep = document.createElement("div");
      rep.className = "repeater";
      wrap.appendChild(rep);

      const ctrl = document.createElement("div");
      ctrl.className = "rep-actions";
      ctrl.innerHTML = `
        <button type="button" class="icon-btn" id="btnAdd" title="Tambah member" aria-label="Tambah member">＋</button>
        <button type="button" class="icon-btn" id="btnDel" title="Hapus member terakhir" aria-label="Hapus member terakhir">−</button>
      `;
      wrap.appendChild(ctrl);

      const btnAdd = ctrl.querySelector("#btnAdd");
      const btnDel = ctrl.querySelector("#btnDel");
      let count = 0;

      const updateAddState = () => {
        btnAdd.disabled = count >= limit;
        btnDel.disabled = count <= 1;
        btnAdd.style.opacity = btnAdd.disabled ? ".5" : "";
        btnDel.style.opacity = btnDel.disabled ? ".5" : "";
        btnAdd.style.cursor = btnAdd.disabled ? "not-allowed" : "";
        btnDel.style.cursor = btnDel.disabled ? "not-allowed" : "";
      };

      const addValidationForRow = (idx) => {
        $(`input[name="member[${idx}][name]"]`).rules("add", {
          required: true,
          messages: { required: "Nama wajib diisi" },
        });
        $(`input[name="member[${idx}][email]"]`).rules("add", {
          required: true,
          email: true,
          messages: {
            required: "Email wajib diisi",
            email: "Format email tidak valid",
          },
        });
        $(`input[name="member[${idx}][phone]"]`).rules("add", {
          required: true,
          phoneID: true,
          minlength: 8,
          messages: {
            required: "Nomor HP wajib diisi",
            minlength: "Minimal 8 karakter",
          },
        });
      };

      const renumber = () => {
        Array.from(rep.children).forEach((card, i) => {
          const title = card.querySelector(".member-title");
          if (title) title.textContent = `Member ${i + 1}`;
          ["name", "email", "phone"].forEach((f) => {
            const input = card.querySelector(`input[data-field="${f}"]`);
            if (!input) return;
            input.name = `member[${i}][${f}]`;
            input.placeholder =
              (f === "name" ? "Nama" : f === "email" ? "Email" : "HP") +
              ` member ${i + 1}`;
          });
          addValidationForRow(i);
        });
        updateAddState();
      };

      const addRow = () => {
        if (count >= limit) return;
        count++;
        const idx = count - 1;

        const card = document.createElement("div");
        card.className = "member-card";
        card.innerHTML = `
          <div class="member-head">
            <span class="member-title">Member ${count}</span>
            <button type="button" class="icon-btn rep-remove" aria-label="Hapus member">×</button>
          </div>
          <div class="member-body">
            <div class="field">
              <label class="label required">Nama</label>
              <input class="input" data-field="name"  name="member[${idx}][name]"  placeholder="Nama member ${count}" required>
            </div>
            <div class="field">
              <label class="label required">Email</label>
              <input class="input" data-field="email" type="email" name="member[${idx}][email]" placeholder="Email member ${count}" required>
            </div>
            <div class="field">
              <label class="label required">No. HP</label>
              <input class="input" data-field="phone" name="member[${idx}][phone]" placeholder="HP member ${count}" inputmode="numeric" required>
            </div>
          </div>
        `;

        card.querySelector(".rep-remove").addEventListener("click", () => {
          if (rep.children.length <= 1) return;
          rep.removeChild(card);
          count = rep.children.length;
          renumber();
        });

        rep.appendChild(card);
        renumber();
      };

      const removeLast = () => {
        if (count <= 1) return;
        rep.removeChild(rep.lastElementChild);
        count = rep.children.length;
        renumber();
      };

      // default 1 card
      addRow();

      // Delegasi klik agar tombol + / - tetap berfungsi
      ctrl.addEventListener("click", (e) => {
        const btn = e.target.closest(".icon-btn");
        if (!btn) return;
        if (btn.id === "btnAdd") addRow();
        if (btn.id === "btnDel") removeLast();
      });
    }

    // ---------- Submit ----------
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!$(form).valid()) {
        const firstErr = form.querySelector("label.error");
        if (firstErr)
          firstErr.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      const fd = new FormData(form);

      // --------- Kumpulkan MEMBER ---------
      const member = [];
      fd.forEach((val, key) => {
        const m = key.match(/^member\[(\d+)\]\[(name|email|phone)\]$/);
        if (m) {
          const idx = +m[1];
          member[idx] = member[idx] || { name: "", email: "", phone: "" };
          member[idx][m[2]] = val;
        }
      });

      // --------- Kumpulkan CONTACT GROUPS & others ---------
      const contact = { manager: null, pelatih: null, orang_tua: null };
      const flat = {}; // sisa field lain

      fd.forEach((val, key) => {
        if (/^member\[\d+\]\[(name|email|phone)\]$/.test(key)) return;

        const mg = key.match(
          /^(manager|pelatih|orang_tua)\[(name|email|phone)\]$/
        );
        if (mg) {
          const g = mg[1],
            f = mg[2];
          contact[g] = contact[g] || { name: "", email: "", phone: "" };
          contact[g][f === "name" ? "name" : f] = val;
          return;
        }
        flat[key] = val;
      });

      // --------- Bentuk PAYLOAD sesuai schema backend ---------
      const teamName = flat["nama_tim"] || flat["nama_band"] || ""; // samakan team & band

      let userData = localStorage.getItem("visitor_data") || null;
      //Parse visitor_data utk dapatkan visitorid
      userData = userData ? JSON.parse(userData) : null;

      console.log("visitorid:", userData?.visitorid);

      const payload = {
        subeventid: detail?.subevent_id, // number/null
        visitorid: userData?.visitorid, // number/null
        team_name: teamName, // string
        link_video: flat["link_video"] || "", // string
        kartu_pelajar: flat["kartu_pelajar"] || "", // string
        manager_detail: [], // array of { nama_manager, email, no_hp }
        orang_tua_detail: [], // array of { nama, email, no_hp }
        member: (member || []).filter(Boolean), // array of { name, email, phone }
      };

      // manager + pelatih DISAMAKAN jadi manager_detail (masing2 1 object jika ada)
      if (
        contact.manager &&
        (contact.manager.name || contact.manager.email || contact.manager.phone)
      ) {
        payload.manager_detail.push({
          name: contact.manager.name || "",
          email: contact.manager.email || "",
          phone: contact.manager.phone || "",
        });
      }
      if (
        contact.pelatih &&
        (contact.pelatih.name || contact.pelatih.email || contact.pelatih.phone)
      ) {
        payload.manager_detail.push({
          name: contact.pelatih.name || "",
          email: contact.pelatih.email || "",
          phone: contact.pelatih.phone || "",
        });
      }

      // orang_tua_detail (1 object jika ada)
      if (
        contact.orang_tua &&
        (contact.orang_tua.name ||
          contact.orang_tua.email ||
          contact.orang_tua.phone)
      ) {
        payload.orang_tua_detail.push({
          nama: contact.orang_tua.name || "",
          email: contact.orang_tua.email || "",
          no_hp: contact.orang_tua.phone || "",
        });
      }

      // Debug

      const cleaned = _deepClean(payload) || {};

      // Kirim ke API
      registCompetition(cleaned);
    });
  }

  // --- Cleaner: hapus nilai & array kosong ---
  function _isEmptyValue(v) {
    return v == null || (typeof v === "string" && v.trim() === "");
  }

  function _deepClean(input) {
    if (Array.isArray(input)) {
      // Bersihkan setiap item, lalu buang yang kosong
      const cleaned = input.map(_deepClean).filter((item) => {
        if (item == null) return false;
        if (typeof item === "string") return item.trim() !== "";
        if (Array.isArray(item)) return item.length > 0;
        if (typeof item === "object") return Object.keys(item).length > 0;
        return true; // number/boolean non-null
      });
      return cleaned.length ? cleaned : undefined;
    }

    if (typeof input === "object" && input !== null) {
      const obj = { ...input };
      Object.keys(obj).forEach((k) => {
        const v = _deepClean(obj[k]);
        if (v === undefined || _isEmptyValue(v)) {
          delete obj[k];
        } else {
          obj[k] = v;
        }
      });
      return Object.keys(obj).length ? obj : undefined;
    }

    // primitive
    return _isEmptyValue(input) ? undefined : input;
  }

  // === Caller API ===
  async function registCompetition(payload) {
    try {
      // Swal loading
      Swal.fire({
        title: "Mengirim data...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      const res = await registerCompetition(payload);
      // Kirim scheduler email
      await schSendEmailQRCompetition();
      Swal.close();

      if (res?.status) {
        await Swal.fire({
          icon: "success",
          title: "Berhasil!",
          text: "Pendaftaran berhasil! Cek email untuk informasi selanjutnya.",
          confirmButtonText: "OK",
        }).then(() => {
          window.location.href = `detail-event.html?id=${
            detail?.event_id || ""
          }`;
        });
        // Menuju ke halaman detail event
      } else {
        Swal.fire({
          icon: "error",
          title: "Gagal",
          text: res?.message || "Terjadi kesalahan saat mendaftar.",
        });
      }
    } catch (error) {
      console.error("Error:", error);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error?.message || "Terjadi kesalahan jaringan/server.",
      });
    }
  }
});
