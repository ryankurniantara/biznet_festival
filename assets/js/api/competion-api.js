import { API_CONFIG } from "../config.js";
import { ApiError, apiFetch } from "../response.js";

export async function registerCompetition(data = {}) {
  const url = `${API_CONFIG.BASE_URL}/competition/regist`;
  try {
    const res = await apiFetch(url, {
      method: "POST",
      showAlert: true,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return res.data;
  } catch (err) {
    throw ApiError.fromNetwork(err, url, "POST");
  }
}

// Scheduled task to send email with QR code to participants
export async function schSendEmailQRCompetition() {
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
    throw ApiError.fromNetwork(err, url, "GET");
  }
}
