// assets/js/edit-profile.js
import {
  getProvinces,
  getCities,
  getDistricts,
  getSubDistricts,
  postProfile,
} from "./api/edit-profile-api.js";
import { getProfile } from "./api/home-api.js";
import { API_CONFIG } from "./config.js";

document.addEventListener("DOMContentLoaded", () => {
  // ==========================
  // Helpers dasar
  // ==========================
  const $ = window.jQuery;
  const provinceSelect = document.getElementById("province");
  const citySelect = document.getElementById("city");
  const districtSelect = document.getElementById("district");
  const subDistrictSelect = document.getElementById("sub_district");

  const resetSelect = (sel, placeholder) => {
    sel.innerHTML = `<option value="">${placeholder}</option>`;
    sel.disabled = true;
  };
  const enable = (sel) => (sel.disabled = false);

  // Set awal: kosongkan anak-anak
  resetSelect(citySelect, "Pilih Kota");
  resetSelect(districtSelect, "Pilih Kecamatan");
  resetSelect(subDistrictSelect, "Pilih Kelurahan");

  // ==========================
  // Load Provinces on demand
  // ==========================
  let isLoadingProvinces = false;

  const loadProvinces = async () => {
    if (isLoadingProvinces) return;
    isLoadingProvinces = true;

    provinceSelect.dataset.state = "loading";
    provinceSelect.innerHTML = `<option value="">Memuat Provinsi…</option>`;

    try {
      const { data = [] } = await getProvinces();
      provinceSelect.innerHTML = `<option value="">Pilih Provinsi</option>`;
      data.forEach((p) => {
        const o = document.createElement("option");
        o.value = p.province_id ?? p.id ?? "";
        o.textContent = p.province ?? p.province_name ?? "";
        provinceSelect.appendChild(o);
      });
      enable(provinceSelect);
      provinceSelect.dataset.state = "loaded";
    } catch (err) {
      console.error("Error fetching provinces:", err);
      provinceSelect.innerHTML = `<option value="">
        Gagal memuat provinsi — klik untuk coba lagi
      </option>`;
      enable(provinceSelect);
      provinceSelect.dataset.state = "error";
    } finally {
      isLoadingProvinces = false;
    }
  };

  // klik dropdown provinsi untuk load / retry
  provinceSelect.addEventListener("click", () => {
    const state = provinceSelect.dataset.state;
    if (!state || state === "error") loadProvinces();
  });

  // ==========================
  // Cascade Province -> City
  // ==========================
  provinceSelect.addEventListener("change", () => {
    const provinceId = provinceSelect.value;
    resetSelect(citySelect, "Pilih Kota");
    resetSelect(districtSelect, "Pilih Kecamatan");
    resetSelect(subDistrictSelect, "Pilih Kelurahan");
    if (!provinceId) return;

    citySelect.innerHTML = `<option value="">Memuat Kota…</option>`;
    getCities(provinceId)
      .then(({ data = [] }) => {
        citySelect.innerHTML = `<option value="">Pilih Kota</option>`;
        data.forEach((c) => {
          const o = document.createElement("option");
          o.value = c.city_id ?? c.id ?? "";
          o.textContent = c.city_name ?? c.name ?? "";
          citySelect.appendChild(o);
        });
        enable(citySelect);
      })
      .catch((err) => {
        console.error("Error fetching cities:", err);
        citySelect.innerHTML = `<option value="">Gagal memuat kota — pilih provinsi lagi atau klik untuk retry</option>`;
        enable(citySelect);
      });
  });

  // ==========================
  // Cascade City -> District
  // ==========================
  citySelect.addEventListener("change", () => {
    const cityId = citySelect.value;
    resetSelect(districtSelect, "Pilih Kecamatan");
    resetSelect(subDistrictSelect, "Pilih Kelurahan");
    if (!cityId) return;

    districtSelect.innerHTML = `<option value="">Memuat Kecamatan…</option>`;
    getDistricts(cityId)
      .then(({ data = [] }) => {
        districtSelect.innerHTML = `<option value="">Pilih Kecamatan</option>`;
        data.forEach((d) => {
          const o = document.createElement("option");
          o.value = d.district_id ?? d.id ?? "";
          o.textContent = d.district_name ?? d.name ?? "";
          districtSelect.appendChild(o);
        });
        enable(districtSelect);
      })
      .catch((err) => {
        console.error("Error fetching districts:", err);
        districtSelect.innerHTML = `<option value="">Gagal memuat kecamatan — klik untuk coba lagi</option>`;
        enable(districtSelect);
      });
  });

  // ==========================
  // Cascade District -> Subdistrict
  // ==========================
  districtSelect.addEventListener("change", () => {
    const districtId = districtSelect.value;
    resetSelect(subDistrictSelect, "Pilih Kelurahan");
    if (!districtId) return;

    subDistrictSelect.innerHTML = `<option value="">Memuat Kelurahan…</option>`;
    getSubDistricts(districtId)
      .then(({ data = [] }) => {
        subDistrictSelect.innerHTML = `<option value="">Pilih Kelurahan</option>`;
        data.forEach((s) => {
          const o = document.createElement("option");
          o.value = s.subdistrict_id ?? s.id ?? "";
          o.textContent = s.subdistrict_name ?? s.name ?? "";
          subDistrictSelect.appendChild(o);
        });
        enable(subDistrictSelect);
      })
      .catch((err) => {
        console.error("Error fetching sub-districts:", err);
        subDistrictSelect.innerHTML = `<option value="">Gagal memuat kelurahan — klik untuk coba lagi</option>`;
        enable(subDistrictSelect);
      });
  });

  // ==========================
  // Segmented Options (Umum vs Pelanggan)
  // ==========================
  const segGeneral = document.getElementById("seg-general");
  const segCustomer = document.getElementById("seg-customer");
  const custnumField = document.getElementById("field-custnum");

  const updateSeg = () => {
    const show = segCustomer.checked;
    custnumField.style.display = show ? "block" : "none";
    // Ketika pindah ke Umum, kosongkan & validasi ulang nomor pelanggan
    if (!show) {
      const $cn = $("#customerNumber");
      $cn.val("");
      // trigger validasi agar pending request dibatalkan
      $cn.valid();
    }
  };
  segGeneral.addEventListener("change", updateSeg);
  segCustomer.addEventListener("change", updateSeg);
  updateSeg();

  // ==========================
  // jQuery Validate — Custom Rules
  // ==========================
  // Phone Indonesia (tanpa '0' karena +62)
  $.validator.addMethod(
    "phoneID",
    function (value) {
      if (!value) return false;
      return /^\d{8,13}$/.test(value); // contoh: 81234567890
    },
    "Masukkan nomor telepon yang valid (8–13 digit)."
  );

  // Minimal usia 13
  $.validator.addMethod(
    "minAge",
    function (value, element, min) {
      if (!value) return false;
      const today = new Date();
      const dob = new Date(value);
      if (isNaN(dob.getTime())) return false;
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
      return age >= (min || 13);
    },
    "Usia minimal {0} tahun."
  );

  // No pelanggan pola umum 10–13 digit
  $.validator.addMethod(
    "custnumPattern",
    function (value) {
      const raw = String(value || "").replace(/\D/g, "");
      // jika optional (required=false) dan kosong -> lulus
      if (this.optional(this.currentElements[0]) && raw === "") return true;
      return /^\d{10,13}$/.test(raw);
    },
    "No Pelanggan tidak valid."
  );

  // Nomor identitas mengikuti jenis yg dipilih
  $.validator.addMethod(
    "idNumberByType",
    function (value, element) {
      const type = $("#id_card").val();
      if (!type) return true; // belum pilih → biarkan 'required' yg urus
      const v = (value || "").trim();
      if (/KTP/i.test(type)) return /^\d{16}$/.test(v); // NIK 16 digit
      if (/SIM/i.test(type)) return /^[A-Za-z0-9]{8,16}$/.test(v); // 8–16 alfanum
      if (/Kartu\s*Pelajar/i.test(type))
        return /^[A-Za-z0-9\-\/ ]{5,30}$/.test(v); // 5–30 karakter
      return v.length >= 5; // fallback
    },
    function () {
      const type = $("#id_card").val();
      if (/KTP/i.test(type)) return "NIK KTP harus 16 digit.";
      if (/SIM/i.test(type)) return "Nomor SIM 8–16 karakter alfanumerik.";
      if (/Kartu\s*Pelajar/i.test(type))
        return "Nomor Kartu Pelajar 5–30 karakter.";
      return "Nomor identitas tidak valid.";
    }
  );

  // Cek nomor pelanggan via AJAX (true jika status===true)
  $.validator.addMethod("custnumExistsAjax", function (value, element) {
    // Skip kalau segmen Umum
    if (!$("#seg-customer").is(":checked")) return true;

    const v = this;
    const raw = String(value || "").replace(/\D/g, "");
    if (!/^\d{10,13}$/.test(raw)) return false;

    const prev = v.previousValue(element);
    if (prev.old === raw) return prev.valid;
    prev.old = raw;

    v.startRequest(element);

    // batalkan request lama
    if (element._xhr && element._xhr.readyState !== 4) {
      try {
        element._xhr.abort();
      } catch {}
    }

    // Swal loading (pakai threshold 250ms agar tidak flicker)
    let swalTimer = setTimeout(() => {
      if (window.Swal && !Swal.isVisible()) {
        Swal.fire({
          title: "Memeriksa nomor…",
          allowOutsideClick: false,
          allowEscapeKey: false,
          didOpen: () => Swal.showLoading(),
        });
      }
    }, 250);

    const closeSwal = () => {
      clearTimeout(swalTimer);
      if (window.Swal && Swal.isVisible()) Swal.close();
    };

    const done = (ok, msg) => {
      closeSwal();
      if (ok) {
        prev.valid = true;
        v.successList.push(element);
        delete v.invalid[element.name];
        v.showErrors();
        v.stopRequest(element, true);
      } else {
        prev.valid = false;
        $(element).val(""); // kosongkan input jika tidak ditemukan
        const errs = {};
        errs[element.name] = msg || "Nomor pelanggan tidak ditemukan";
        v.invalid[element.name] = true;
        v.showErrors(errs);
        v.stopRequest(element, false);
      }
    };

    element._xhr = $.ajax({
      url: `${API_CONFIG.BASE_URL}/ckCustNum`,
      method: "POST",
      dataType: "json",
      data: { idcust: raw }, // urlencoded → $_POST['idcust']
      timeout: 10000,
    })
      .done((res) => {
        const ok = res?.status === true;
        done(ok, res?.message);
      })
      .fail((xhr, status) => {
        const msg =
          xhr?.responseJSON?.message ||
          (status === "timeout"
            ? "Server timeout"
            : "Gagal memeriksa nomor pelanggan");
        done(false, msg);
      });

    return "pending";
  });

  // ==========================
  // jQuery Validate — Setup
  // ==========================
  const form = $("#editForm");
  form.validate({
    ignore: [],
    rules: {
      customerNumber: {
        required: {
          depends: function () {
            return document.getElementById("seg-customer").checked;
          },
        },
        digits: true,
        minlength: 10,
        maxlength: 13,
        custnumPattern: true,
        custnumExistsAjax: true,
      },
      name: { required: true, minlength: 3 },
      gender: { required: true },
      dob: { required: true, minAge: 13 },
      email: { required: true, email: true },
      phone: { required: true, phoneID: true },
      address: { required: true, minlength: 5 },
      province: { required: true },
      city: { required: true },
      district: { required: true },
      sub_district: { required: true },
      id_card: { required: false },
      id_number: {
        required: {
          depends: function () {
            return $("#id_card").val() !== "";
          },
        },
        idNumberByType: true,
      },
    },
    messages: {
      customerNumber: {
        required: "No Pelanggan wajib diisi untuk segmen Pelanggan.",
        digits: "Hanya angka.",
        minlength: "Minimal 10 digit.",
        maxlength: "Maksimal 13 digit.",
        custnumExistsAjax: "Nomor pelanggan tidak ditemukan",
      },
      name: {
        required: "Nama wajib diisi.",
        minlength: "Nama terlalu pendek.",
      },
      gender: { required: "Pilih jenis kelamin." },
      dob: {
        required: "Tanggal lahir wajib diisi.",
        minAge: "Minimal usia 13 tahun.",
      },
      email: {
        required: "Email wajib diisi.",
        email: "Format email tidak valid.",
      },
      phone: { required: "No. Telepon wajib diisi." },
      address: {
        required: "Alamat wajib diisi.",
        minlength: "Alamat terlalu pendek.",
      },
      province: { required: "Pilih provinsi." },
      city: { required: "Pilih kota." },
      district: { required: "Pilih kecamatan." },
      sub_district: { required: "Pilih kelurahan." },
      id_card: { required: "Pilih jenis identitas." },
      id_number: {
        required: "Nomor identitas wajib diisi saat jenis dipilih.",
      },
    },
    errorPlacement: function (error, element) {
      const $el = $(element);
      const $field = $el.closest(".field");
      if ($field.length) {
        const $hint = $field.find(".hint");
        if ($hint.length) {
          error.insertAfter($hint);
        } else if ($el.closest(".input-group").length) {
          error.insertAfter($el.closest(".input-group"));
        } else {
          error.appendTo($field);
        }
      } else {
        error.insertAfter($el);
      }
    },
    highlight: function (element) {
      $(element).closest(".field").addClass("invalid");
    },
    unhighlight: function (element) {
      $(element).closest(".field").removeClass("invalid");
    },

    // === SUBMIT ===
    submitHandler: function (formEl, e) {
      if (e && typeof e.preventDefault === "function") e.preventDefault();

      const payload = {
        name: $("#name").val().trim(),
        gender: $("#gender").val().trim(), // "L" / "P"
        birthdate: $("#dob").val().trim(), // yyyy-mm-dd
        country_code_mobile_no: "+62",
        mobile_number: $("#phone").val().trim(),
        address: $("#address").val().trim(),
        province: $("#province").val().trim(), // id
        city: $("#city").val().trim(), // id
        district: $("#district").val().trim(), // id
        subdistrict: $("#sub_district").val().trim(), // id
        identity_type: $("#id_card").val().trim(),
        identity_no: $("#id_number").val().trim(),
        idcust: document.getElementById("seg-customer").checked
          ? $("#customerNumber").val().trim()
          : undefined,
      };

      console.log("[validate] Form valid → kirim payload:", payload);
      postData(payload);
      return false; // stop native submit
    },
  });

  // Re-validate saat kondisi berubah
  $("#id_card").on("change", function () {
    $("#id_number").valid();
  });
  $("#id_number").on("input blur", function () {
    $(this).valid();
  });

  // ==========================
  // Submit → API
  // ==========================
  async function postData(data = {}) {
    console.log("[postData] kirim:", data);
    try {
      const res = await postProfile(data);
      console.log("[postData] response:", res);

      if (res?.status === true) {
        if (window.Swal) {
          await Swal.fire({
            icon: "success",
            title: "Berhasil!",
            text: res.message || "Data berhasil disimpan.",
          });
        } else {
          alert("Data berhasil disimpan.");
        }
        window.location.href = "profile.html";
        return;
      }
      throw new Error(res?.message || "Gagal menyimpan data");
    } catch (error) {
      console.error("[postData] error:", error);
      if (window.Swal) {
        Swal.fire({
          icon: "error",
          title: "Gagal!",
          text: error.message || "Data gagal disimpan.",
        });
      } else {
        alert("Data gagal disimpan.");
      }
    }
  }

  // ==========================
  // Prefill dari API getProfile
  // ==========================
  const userData = JSON.parse(localStorage.getItem("visitor_data")) || {};

  async function fillForm(data) {
    if (!data) return;

    // Segmen
    if (data.customer_status === "bp") {
      document.getElementById("seg-customer").checked = true;
      $("#customerNumber").val(data.idcust || "");
    } else {
      document.getElementById("seg-general").checked = true;
      $("#customerNumber").val("");
    }
    updateSeg();

    // Field teks
    $("#name").val(data.name || "");
    // data.gender bisa "L"/"P" → set langsung
    $("#gender").val(data.gender || "");
    $("#dob").val(data.birthdate || "");
    $("#email").val(data.email || "");
    $("#phone").val(data.phone || "");
    $("#address").val(data.address || "");

    // Pastikan provinsi loaded dulu
    if (
      !provinceSelect.dataset.state ||
      provinceSelect.dataset.state === "error"
    ) {
      try {
        await loadProvinces();
      } catch {}
    }

    // Set dropdown pakai ID (fallback ke *_id)
    const pid = data.province || data.province_id || "";
    if (pid) {
      $("#province").val(String(pid)).trigger("change");
    }

    // Tunggu sedikit agar chain load sempat jalan
    await new Promise((r) => setTimeout(r, 80));

    const cid = data.city || data.city_id || "";
    if (cid) {
      $("#city").val(String(cid)).trigger("change");
    }

    await new Promise((r) => setTimeout(r, 80));

    const did = data.district || data.district_id || "";
    if (did) {
      $("#district").val(String(did)).trigger("change");
    }

    await new Promise((r) => setTimeout(r, 80));

    const sid = data.subdistrict || data.subdistrict_id || "";
    if (sid) {
      $("#sub_district").val(String(sid));
    }

    // Identitas
    $("#id_card").val(data.id_card || data.identity_type || "");
    $("#id_number").val(data.id_number || data.identity_no || "");
  }

  async function loadProfile() {
    console.log("Loading profile for:", userData);
    try {
      if (userData?.status_visitor) {
        // Muat provinsi lebih awal untuk meminimalkan tunggu
        if (!provinceSelect.dataset.state) await loadProvinces();
        const profileData = await getProfile(userData.email_crypted);
        console.log("Fetched profile data:", profileData);
        await fillForm(profileData);
      } else {
        // kalau tidak login / tidak ada status, set minimal: aktifkan provinsi agar bisa dipilih manual
        if (!provinceSelect.dataset.state) await loadProvinces();
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      // tetap buka provinsi jika gagal getProfile
      if (!provinceSelect.dataset.state) await loadProvinces();
    }
  }

  // GO
  loadProfile();
});
