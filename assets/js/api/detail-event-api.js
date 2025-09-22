import { API_CONFIG } from "../config.js";
import { ApiError, apiFetch } from "../response.js";

export async function fetchEventDetails(eventId) {
  const url = `${API_CONFIG.BASE_URL}/detail-event/${eventId}`;
  const token = localStorage.getItem("visitor_token") ?? null;
  console.log("Using token:", token);

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

    console.log("API response:", res.data);
    return res.data;
  } catch (err) {
    throw ApiError.fromNetwork(err, url, "GET");
  }
}
