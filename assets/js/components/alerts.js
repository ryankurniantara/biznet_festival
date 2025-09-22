// assets/js/alerts.js
(function (global) {
  // Toast default (pojok kanan atas)
  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
  });

  function success(message = "Berhasil", subtitle = "") {
    return Swal.fire({
      icon: "success",
      title: message,
      text: subtitle,
      confirmButtonText: "OK",
    });
  }

  function error(message = "Terjadi kesalahan", subtitle = "") {
    return Swal.fire({
      icon: "error",
      title: message,
      text: subtitle,
      confirmButtonText: "OK",
    });
  }

  function info(message = "Info", subtitle = "") {
    return Swal.fire({
      icon: "info",
      title: message,
      text: subtitle,
      confirmButtonText: "OK",
    });
  }

  function warning(message = "Perhatian", subtitle = "") {
    return Swal.fire({
      icon: "warning",
      title: message,
      text: subtitle,
      confirmButtonText: "OK",
    });
  }

  async function confirm({
    title = "Yakin?",
    text = "Tindakan ini tidak bisa dibatalkan.",
    confirmText = "Ya, lanjut",
    cancelText = "Batal",
    icon = "warning",
  } = {}) {
    const res = await Swal.fire({
      icon,
      title,
      text,
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      reverseButtons: true,
    });
    return res.isConfirmed;
  }

  function toast(message = "Tersimpan", icon = "success") {
    return Toast.fire({ icon, title: message });
  }

  // Loading overlay
  function loading(text = "Memproses...") {
    return Swal.fire({
      title: text,
      allowEscapeKey: false,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });
  }
  function close() {
    return Swal.close();
  }

  // Helper untuk mapping error API (cocok dipakai dengan ApiError yang kamu punya)
  function handleApiError(err) {
    // Ambil info dasar
    const status = err?.status ?? 0;
    const msg =
      err?.data?.message ||
      err?.data?.error ||
      err?.statusText ||
      err?.message ||
      "Terjadi kesalahan";

    // Kumpulkan detail validasi (jika ada: { field: [msg] } / array / string)
    let details = "";
    const vErrors =
      err?.data?.errors || err?.data?.error?.details || err?.data?.detail;
    if (vErrors && typeof vErrors === "object") {
      const lines = [];
      for (const [k, v] of Object.entries(vErrors)) {
        const val = Array.isArray(v) ? v.join(", ") : String(v);
        lines.push(`• ${k}: ${val}`);
      }
      details = lines.join("<br>");
    } else if (typeof vErrors === "string") {
      details = vErrors;
    }

    // Pesan default per status umum
    let title = `Gagal (${status || "N/A"})`;
    let text = msg;

    switch (status) {
      case 0:
        title = "Jaringan bermasalah";
        text = "Periksa koneksi internet kamu.";
        break;
      case 400:
        title = "Bad Request";
        break;
      case 401:
        title = "Butuh Login";
        text = "Sesi berakhir atau belum login.";
        break;
      case 403:
        title = "Akses Ditolak";
        text = "Kamu tidak punya izin untuk aksi ini.";
        break;
      case 404:
        title = "Tidak Ditemukan";
        break;
      case 408:
        title = "Request Timeout";
        text = "Permintaan terlalu lama, coba lagi.";
        break;
      case 409:
        title = "Conflict";
        break;
      case 422:
        title = "Validasi Gagal";
        // jika ada detail validasi, tampilkan sebagai HTML
        break;
      case 429:
        title = "Terlalu Banyak Permintaan";
        text = "Tunggu sebentar lalu coba lagi.";
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        title = "Server Bermasalah";
        text = "Silakan coba beberapa saat lagi.";
        break;
      default:
        // biarkan msg apa adanya
        break;
    }

    // Render alert (pakai html jika ada detail)
    if (details) {
      return Swal.fire({
        icon: "error",
        title,
        html: `${Swal.escapeHtml(
          text
        )}<br><br><div style="text-align:left">${details}</div>`,
        confirmButtonText: "OK",
      });
    }
    return Swal.fire({
      icon: "error",
      title,
      text,
      confirmButtonText: "OK",
    });
  }

  // expose global
  global.Alert = {
    success,
    error,
    info,
    warning,
    confirm,
    toast,
    loading,
    close,
    handleApiError,
  };
})(window);
