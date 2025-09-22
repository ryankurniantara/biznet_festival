import { apiFetch, ApiError } from "../response.js";
import { API_CONFIG } from "../config.js";

export async function login(email) {
  const url = `${API_CONFIG.BASE_URL}/sendEmailVerif`;
  const body = {
    email: email,
  };
  try {
    const res = await apiFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    return res.data;
  } catch (err) {}
  throw ApiError.fromNetwork(err, url, "POST");
}

export async function getApiScheduler() {
  const url = `${API_CONFIG.BASE_URL}/schMailVerify`;
  try {
    const res = await apiFetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    console.log(res);
    return res.data;
  } catch (err) {}
  throw ApiError.fromNetwork(err, url, "GET");
}
