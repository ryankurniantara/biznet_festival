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
  const userData = JSON.parse(localStorage.getItem("visitor_data") || "{}");

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

  async function postData(data = {}) {
    try {
      //Loading Swall fire
      console.log("Submitting data:", data);

      Swal.fire({
        title: "Menyimpan data…",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => Swal.showLoading(),
      });
      const res = await postProfile(data);
      Swal.close();

      if (res.status) {
        Swal.fire({
          icon: "success",
          title: "Berhasil!",
          text: res.message || "Data berhasil disimpan.",
        }).then(() => {
          // Kembali ke halaman sebelumnya
          window.location.href = "profile.html";
        });
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Gagal!",
        text: error.message || "Data gagal disimpan.",
      });
    }
  }

  // Fill form
  function toYMD(input) {
    if (!input) return "";
    // Terima "YYYY-MM-DD", "YYYY/MM/DD", "DD-MM-YYYY", dst → normalize ke YYYY-MM-DD
    const s = String(input).trim();
    // Kalau sudah pattern YYYY-MM-DD, langsung pakai
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    // Coba parse Date
    const parts = s.replace(/[\/.]/g, "-").split("-");
    let y, m, d;
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      [y, m, d] = parts.map(Number);
    } else {
      // DD-MM-YYYY
      [d, m, y] = parts.map(Number);
    }
    const dt = new Date(y, (m || 1) - 1, d || 1);
    if (isNaN(dt.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  }

  // Populate select util
  function populateSelect(selectEl, list, { valueKey, labelKey, placeholder }) {
    selectEl.innerHTML = `<option value="">${placeholder}</option>`;
    list.forEach((row) => {
      const opt = document.createElement("option");
      opt.value = row[valueKey] ?? row.id ?? "";
      opt.textContent = row[labelKey] ?? row.name ?? "";
      selectEl.appendChild(opt);
    });
    selectEl.disabled = false;
  }

  // Loaders terprogram (bisa di-`await`)
  async function loadCitiesFor(provinceId) {
    resetSelect(citySelect, "Pilih Kota");
    resetSelect(districtSelect, "Pilih Kecamatan");
    resetSelect(subDistrictSelect, "Pilih Kelurahan");
    if (!provinceId) return [];
    const { data = [] } = await getCities(provinceId);
    populateSelect(citySelect, data, {
      valueKey: "city_id",
      labelKey: "city_name",
      placeholder: "Pilih Kota",
    });
    return data;
  }
  async function loadDistrictsFor(cityId) {
    resetSelect(districtSelect, "Pilih Kecamatan");
    resetSelect(subDistrictSelect, "Pilih Kelurahan");
    if (!cityId) return [];
    const { data = [] } = await getDistricts(cityId);
    populateSelect(districtSelect, data, {
      valueKey: "district_id",
      labelKey: "district_name",
      placeholder: "Pilih Kecamatan",
    });
    return data;
  }
  async function loadSubDistrictsFor(districtId) {
    resetSelect(subDistrictSelect, "Pilih Kelurahan");
    if (!districtId) return [];
    const { data = [] } = await getSubDistricts(districtId);
    populateSelect(subDistrictSelect, data, {
      valueKey: "subdistrict_id",
      labelKey: "subdistrict_name",
      placeholder: "Pilih Kelurahan",
    });
    return data;
  }

  // Bantu set value kalau ada opsinya
  function setIfExists($sel, value) {
    if (!value) return false;
    const exists = $sel.find(`option[value="${value}"]`).length > 0;
    if (exists) {
      $sel.val(value);
      return true;
    }
    return false;
  }

  // Fill form dari API
  async function fillForm() {
    try {
      if (!userData.status_visitor) return;
      showLoader();
      const res = await getProfile(userData.email_crypted);
      if (!res?.status) return;

      const p = res.profile || {};
      console.log("Profile data:", p);
      // Normalisasi key yang beda-beda
      const provinceId = p.province_id ?? p.province ?? "";
      const cityId = p.city_id ?? p.city ?? "";
      const districtId = p.district_id ?? p.district ?? "";
      const subdistrictId =
        p.subdistrict_id ?? p.subdistrict ?? p.sub_district ?? "";
      const idType = p.identitytype ?? p.id_card ?? "";
      const idNo = p.identityno ?? p.identityno ?? "";

      // Field sederhana
      $("#name").val(p.name || "");
      $("#gender").val(p.gender || "");
      $("#dob").val(toYMD(p.birthdate)); // normalize → YYYY-MM-DD (input[type=date])
      $("#email").val(p.email || "");
      $("#phone").val(p.mobile || "");
      $("#address").val(p.address || "");
      $("#id_card").val(idType || "");
      $("#id_number").val(idNo || "");

      // 1) Provinces harus loaded dulu
      if (
        !provinceSelect.dataset.state ||
        provinceSelect.dataset.state === "error"
      ) {
        await loadProvinces(); // fungsi kamu yang sudah ada
      } else if (provinceSelect.dataset.state !== "loaded") {
        await loadProvinces();
      }

      // Set province jika ada di opsi
      setIfExists($("#province"), provinceId);

      // 2) Cities
      const cities = await loadCitiesFor(provinceId);
      setIfExists($("#city"), cityId);

      // 3) Districts
      const dists = await loadDistrictsFor(cityId);
      setIfExists($("#district"), districtId);

      // 4) Subdistricts
      const subs = await loadSubDistrictsFor(districtId);
      setIfExists($("#sub_district"), subdistrictId);

      // Trigger manual change agar event listener lain (kalau ada) ikut jalan
      $("#province").trigger("change");
      $("#city").trigger("change");
      $("#district").trigger("change");
      $("#sub_district").trigger("change");

      // Segmented (General/Pelanggan) auto tampilkan field jika user BP
      const isBP =
        (p.segment || "").toLowerCase() === "pelanggan" ||
        !!p.idcust ||
        !!p.customerNumber;
      if (isBP) {
        document.getElementById("seg-customer").checked = true;
      } else {
        document.getElementById("seg-general").checked = true;
      }
      // tampil/hidden field customerNumber sesuai segmen
      (function updateSeg() {
        const custnumField = document.getElementById("field-custnum");
        custnumField.style.display = document.getElementById("seg-customer")
          .checked
          ? "block"
          : "none";
      })();
      if (p.customerNumber)
        $("#customerNumber").val(String(p.customerNumber).replace(/\D/g, ""));

      hideLoader();
    } catch (err) {
      console.error("Error loading profile data:", err);
      hideLoader();
    }
  }

  const provinceSelect = document.getElementById("province");
  const citySelect = document.getElementById("city");
  const districtSelect = document.getElementById("district");
  const subDistrictSelect = document.getElementById("sub_district");

  // Helpers
  const resetSelect = (sel, placeholder) => {
    sel.innerHTML = `<option value="">${placeholder}</option>`;
    sel.disabled = true;
  };
  const enable = (sel) => (sel.disabled = false);

  // Set awal
  resetSelect(citySelect, "Pilih Kota");
  resetSelect(districtSelect, "Pilih Kecamatan");
  resetSelect(subDistrictSelect, "Pilih Kelurahan");

  // ===== Provinces: load hanya saat klik, bisa retry =====
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

  // Province -> City
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

  // City -> District
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

  // District -> SubDistrict
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

  // Segmented Options
  const segGeneral = document.getElementById("seg-general");
  const segCustomer = document.getElementById("seg-customer");
  const custnumField = document.getElementById("field-custnum");
  const updateSeg = () =>
    (custnumField.style.display = segCustomer.checked ? "block" : "none");
  segGeneral.addEventListener("change", updateSeg);
  segCustomer.addEventListener("change", updateSeg);
  updateSeg();

  // Phone Indonesia (tanpa '0' karena ada +62)
  $.validator.addMethod(
    "phoneID",
    function (value) {
      if (!value) return false;
      return /^\d{8,13}$/.test(value); // 81234567890
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

  // No pelanggan (contoh umum 10–13 digit; sesuaikan jika ada pola khusus)
  $.validator.addMethod(
    "custnumPattern",
    function (value) {
      if (!value) return false;
      return /^\d{10,13}$/.test(value);
    },
    "No Pelanggan tidak valid."
  );

  // Nomor identitas mengikuti jenis yg dipilih
  $.validator.addMethod(
    "idNumberByType",
    function (value) {
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

  // Cek nomor pelanggan via AJAX
  $.validator.addMethod("custnumExistsAjax", function (value, element) {
    const v = this;
    if (!$("#seg-customer").is(":checked")) return true;

    const raw = String(value || "").replace(/\D/g, "");
    if (!/^\d{10,13}$/.test(raw)) return false;

    const prev = v.previousValue(element);
    if (prev.old === raw) return prev.valid;
    prev.old = raw;

    v.startRequest(element);

    // batalkan request lama
    if (element._xhr && element._xhr.readyState !== 4)
      try {
        element._xhr.abort();
      } catch {}

    // Tampilkan Swal loading (dengan threshold agar gak kedip)
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
        $(element).val(""); // kosongkan input
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

  const form = $("#editForm");
  form.validate({
    ignore: ":hidden, [disabled]",
    rules: {
      customerNumber: {
        required: {
          depends: function () {
            if (
              document.getElementById("seg-customer").checked &&
              $("#customerNumber").val() !== ""
            )
              return true;
          },
        },
        digits: true,
        minlength: 10,
        maxlength: 13,
        custnumPattern: true,
        custnumExistsAjax: true,
        onkeyup: false,
      },
      name: {
        required: true,
        minlength: 3,
      },
      gender: {
        required: true,
      },
      dob: {
        required: true,
        minAge: 13,
      },
      email: {
        required: true,
        email: true,
      },
      phone: {
        required: true,
        phoneID: true,
      },
      address: {
        required: true,
        minlength: 5,
      },
      province: { required: true },
      city: { required: true },
      district: { required: true },
      sub_district: { required: true },
      id_card: { required: true },
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
      phone: {
        required: "No. Telepon wajib diisi.",
      },
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

    // Penempatan error yang rapi (pakai jQuery object)
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

    // Tambah/hapus class invalid
    highlight: function (element) {
      $(element).closest(".field").addClass("invalid");
    },
    unhighlight: function (element) {
      $(element).closest(".field").removeClass("invalid");
    },

    // Submit sukses (semua valid)
    submitHandler: function (formEl, e) {
      e.preventDefault();

      //       {
      //   "name": "Gusjek",
      //   "gender": "L", //L or P
      //   "birthdate": "1990-05-15", //y-m-d
      //   "country_code_mobile_no": "+62",
      //   "mobile_number": "81234567890", //no need to include 0 at the front,
      //   "address": "Jl. Sudirman No. 123, RT 01/RW 02",
      //   "province": "1",
      //   "city": "41",
      //   "district": "91",
      //   "subdistrict": "901",
      //   "identity_type": "KTP",
      //   "identity_no": "3201234567890123",
      //   "idcust": "12345678" //optional if visitor is BP
      // }
      const payload = {
        name: $("#name").val(),
        gender: $("#gender").val(),
        birthdate: $("#dob").val(),
        country_code_mobile_no: "+62",
        mobile_number: $("#phone").val(),
        address: $("#address").val(),
        province: $("#province").val(),
        city: $("#city").val(),
        district: $("#district").val(),
        sub_district: $("#sub_district").val(),
        identity_type: $("#id_card").val(),
        identity_no: $("#id_number").val(),
        email: $("#email").val(),
      };
      if (document.getElementById("seg-customer").checked) {
        payload.idcust = "bp";
        payload.customerNumber = $("#customerNumber").val();
      }

      console.log("Form valid, siap submit:", payload);
      // Jika tidak ada data yang dirubah jangan kirim apa-apa
      const unchanged = Object.keys(payload).every((k) => {
        const v = payload[k] || "";
        const pval = (userData[k] || "").trim();
        return String(v).trim() === String(pval).trim();
      });

      if (unchanged) {
        console.log("Tidak ada perubahan data, tidak perlu submit.");
      } else {
        postData(payload);
        console.log("Ada perubahan data, submit ke API.");
      }
    },
  });

  // Re-validate saat kondisi berubah

  $("#id_card").on("change", function () {
    $("#id_number").valid();
  });
  $("#id_number").on("input blur", function () {
    $(this).valid();
  });

  fillForm();
});
