import { API_CONFIG } from "../config";
import { ApiError, apiFetch } from "../response.js";

export async function getEvents({ page = 1, pageSize = 8, year } = {}) {
  const params = new URLSearchParams();
  params.set("limit", String(pageSize));
  params.set("page", String(page));
  if (year !== undefined && year !== null && String(year).trim() !== "") {
    params.set("year", String(year));
  }

  const url = `${API_CONFIG.BASE_URL}/event?${params.toString()}`;

  try {
    const res = await apiFetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      showAlert: true,
    });

    // === sesuai struktur: data:Array, pagination:Object ===
    const payload = res.data ?? {};
    const items = Array.isArray(payload.data) ? payload.data : [];
    const p = payload.pagination || {};

    const meta = {
      currentPage: Number(p.current_page ?? page) || 1,
      perPage: Number(p.per_page ?? pageSize) || pageSize,
      totalPages: Number(p.last_page ?? 1) || 1,
      totalItems: Number(p.total ?? items.length) || items.length || 0,
      from: p.from ?? null,
      to: p.to ?? null,
    };

    return { items, meta };
  } catch (err) {
    throw ApiError.fromNetwork(err, url, "GET");
  }
}
