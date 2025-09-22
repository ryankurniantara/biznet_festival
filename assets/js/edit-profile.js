// assets/js/edit-profile.js
import {
  getProvinces,
  getCities,
  getDistricts,
  getSubDistricts,
  updateProfile,
} from "./api/edit-profile-api.js";

import { API_CONFIG } from "./config.js";

document.addEventListener("DOMContentLoaded", () => {
  async function postData(data = {}) {
    try {
      const res = await updateProfile(data);

      if (res.status === true) {
        if (window.Swal) {
          Swal.fire({
            icon: "success",
            title: "Berhasil!",
            text: res.message || "Data berhasil disimpan.",
          });
          // Redirect to profile page after success
          window.location.href = "profile.html";
        } else {
          alert("Data berhasil disimpan.");
        }
      }
    } catch (error) {
      console.error("Error saving profile data:", error);
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

  // Filling Form Data

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
    ignore: [],
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

      const payload = {
        jenis: document.getElementById("seg-customer").checked
          ? "Pelanggan"
          : "Umum",
        customerNumber: $("#customerNumber").val() || null,
        name: $("#name").val(),
        gender: $("#gender").val(),
        dob: $("#dob").val(),
        email: $("#email").val(),
        phone: $("#phone").val(),
        address: $("#address").val(),
        province: $("#province").val(),
        city: $("#city").val(),
        district: $("#district").val(),
        sub_district: $("#sub_district").val(),
        id_card: $("#id_card").val(),
        id_number: $("#id_number").val(),
      };

      console.log("Form valid, siap submit:", payload);

      // TODO: kirim ke API kamu di sini
      // fetch('/api/profile', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })

      if (window.Swal) {
        Swal.fire({
          icon: "success",
          title: "Berhasil!",
          text: "Data berhasil divalidasi dan siap dikirim.",
        });
      } else {
        alert("Data valid. Siap dikirim:\n" + JSON.stringify(payload, null, 2));
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
});
