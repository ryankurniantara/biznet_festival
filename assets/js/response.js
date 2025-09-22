// api.js (simple version + Swal alerts)
export const HTTP_STATUS = {
  // 2xx
  200: "OK",
  201: "Created",
  204: "No Content",
  // 3xx
  304: "Not Modified",
  // 4xx
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  408: "Request Timeout",
  409: "Conflict",
  422: "Unprocessable Content",
  429: "Too Many Requests",
  // 5xx
  500: "Internal Server Error",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
};

export class ApiError extends Error {
  constructor({
    message,
    status = 0,
    statusText = "",
    url = "",
    method = "GET",
    data = null,
  }) {
    super(message || statusText || "Request failed");
    this.name = "ApiError";
    this.status = status;
    this.statusText = statusText || HTTP_STATUS[status] || "";
    this.url = url;
    this.method = method;
    this.data = data; // bisa object/string
  }

  static fromResponse(res, data) {
    return new ApiError({
      message:
        data?.message ||
        data?.error ||
        HTTP_STATUS[res.status] ||
        res.statusText,
      status: res.status,
      statusText: res.statusText,
      url: res.url,
      method: res._method || "GET",
      data,
    });
  }

  static fromNetwork(err, url, method) {
    return new ApiError({
      message: "Network error",
      status: 0,
      statusText: "Network Error",
      url,
      method,
      data: { cause: String(err?.message || err) },
    });
  }
}

export class ApiResponse {
  constructor(response) {
    this.response = response;
    this.status = response.status;
    this.statusText = response.statusText || HTTP_STATUS[response.status] || "";
    this.ok = response.ok;
    this.url = response.url;
    this.headers = response.headers;
    this.data = null; // hasil parse
  }

  async parse() {
    const ct = this.headers.get("content-type") || "";
    if (this.status === 204 || this.status === 205 || this.status === 304)
      return this;

    try {
      if (ct.includes("application/json") || ct.includes("+json")) {
        this.data = await this.response.json();
      } else if (ct.startsWith("text/") || ct === "") {
        this.data = await this.response.text();
      } else {
        this.data = await this.response.blob();
      }
    } catch (_) {
      this.data = null; // gagal parse: biarin null
    }
    return this;
  }

  // Jika cuma mau JSON (fail-safe, nggak throw)
  async parseJson() {
    try {
      this.data = await this.response.json();
    } catch (_) {
      this.data = null;
    }
    return this;
  }
}

// ============ Swal integration ============
function escapeHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function extractValidationDetails(d) {
  // dukung berbagai bentuk umum { errors: { field: [...] } } atau {detail: ...}
  const v = d?.errors || d?.error?.details || d?.detail || d?.validation;
  if (!v) return "";
  if (typeof v === "string")
    return `<div style="text-align:left">${escapeHtml(v)}</div>`;
  if (Array.isArray(v)) {
    return `<ul style="text-align:left;margin:6px 0 0 16px">${v
      .map((x) => `<li>${escapeHtml(String(x))}</li>`)
      .join("")}</ul>`;
  }
  if (typeof v === "object") {
    const lines = Object.entries(v).map(([k, val]) => {
      const msg = Array.isArray(val) ? val.join(", ") : String(val);
      return `<li><b>${escapeHtml(k)}</b>: ${escapeHtml(msg)}</li>`;
    });
    return `<ul style="text-align:left;margin:6px 0 0 16px">${lines.join(
      ""
    )}</ul>`;
  }
  return "";
}

function titleFor(err) {
  const s = err?.status ?? 0;
  switch (s) {
    case 0:
      return "Jaringan bermasalah";
    case 400:
      return "Bad Request";
    case 401:
      return "Butuh Login";
    case 403:
      return "Akses Ditolak";
    case 404:
      return "Tidak Ditemukan";
    case 408:
      return "Request Timeout";
    case 409:
      return "Conflict";
    case 422:
      return "Validasi Gagal";
    case 429:
      return "Terlalu Banyak Permintaan";
    case 500:
    case 502:
    case 503:
    case 504:
      return "Server Bermasalah";
    default:
      return `Gagal (${s || "N/A"})`;
  }
}

function messageFor(err) {
  return (
    err?.data?.message ||
    err?.data?.error ||
    err?.statusText ||
    err?.message ||
    "Terjadi kesalahan"
  );
}

function notifyError(err) {
  // Jika kamu sebelumnya pakai helper Alert.handleApiError, manfaatkan dulu itu
  if (typeof window !== "undefined" && window.Alert?.handleApiError) {
    window.Alert.handleApiError(err);
    return;
  }

  // fallback: pakai Swal langsung jika tersedia
  if (typeof window !== "undefined" && window.Swal?.fire) {
    const title = titleFor(err);
    const text = messageFor(err);
    const detailsHtml = extractValidationDetails(err?.data);

    if (detailsHtml) {
      window.Swal.fire({
        icon: "error",
        title,
        html: `${escapeHtml(text)}<br><br>${detailsHtml}`,
        confirmButtonText: "OK",
      });
    } else {
      window.Swal.fire({
        icon: "error",
        title,
        text,
        confirmButtonText: "OK",
      });
    }
    return;
  }

  // fallback terakhir: console
  console.warn("API error:", err);
}
// =========================================

export async function apiFetch(input, init = {}) {
  const method = (init.method || "GET").toUpperCase();
  const showAlert = init.showAlert !== undefined ? !!init.showAlert : true; // default: true
  const headers = init.headers || {};
  const body = init.body;

  try {
    // Add Auth header if token available
    const res = await fetch(input, init);
    res._method = method;
    res._headers = headers;

    const wrapped = new ApiResponse(res);
    await wrapped.parse();

    if (!res.ok) {
      const apiErr = ApiError.fromResponse(res, wrapped.data);
      if (showAlert) notifyError(apiErr); // <<-- Swal alert di sini
      throw apiErr;
    }
    return wrapped; // .data sudah terisi
  } catch (err) {
    const isApiErr = err instanceof ApiError;
    const url = typeof input === "string" ? input : input?.url || "";
    const apiErr = isApiErr ? err : ApiError.fromNetwork(err, url, method);
    if (showAlert) notifyError(apiErr); // <<-- dan di sini juga (network error)
    throw apiErr;
  }
}

// Helper opsional buat ambil pesan singkat
export function getErrorMessage(err) {
  if (err instanceof ApiError) {
    return (
      err.data?.message || err.statusText || err.message || "Request failed"
    );
  }
  return err?.message || "Unknown error";
}
