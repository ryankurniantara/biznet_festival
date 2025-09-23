import { API_CONFIG } from "../config.js";
import { ApiError, apiFetch } from "../response.js";

export async function fetchEventDetails(eventId) {
  const url = `${API_CONFIG.BASE_URL}/detail-event/${eventId}`;
  const token = localStorage.getItem("visitor_token") ?? null;

  if (!token) {
    throw new Error("No authentication token found");
  }

  try {
    const res = await apiFetch(url, {
      method: "GET",
      showAlert: true,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    return res.data;
  } catch (err) {
    throw ApiError.fromNetwork(err, url, "GET");
  }
}

export async function registerForEvent(form = {}) {
  const url = `${API_CONFIG.BASE_URL}/regist`;

  try {
    const res = await apiFetch(url, {
      method: "POST",
      showAlert: true,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    return res.data;
  } catch (err) {
    throw ApiError.fromNetwork(err, url, "POST");
  }
}

export async function schSendEmailQR() {
  const url = `${API_CONFIG.BASE_URL}/schSendEmailQR`;

  try {
    const res = await apiFetch(url, {
      method: "GET",
      showAlert: true,
      headers: {
        "Content-Type": "application/json",
      },
    });
    return res.data;
  } catch (err) {
    throw ApiError.fromNetwork(err, url, "POST");
  }
}
