import { API_CONFIG } from "../config";
import { ApiError, apiFetch } from "../response.js";

export async function getEvents(page = 1, limit = 10, year = null) {
  try {
    const pagination = `?page=${page}&limit=${limit}`;
    const response = await apiFetch(
      `${API_CONFIG.BASE_URL}/event${pagination}${year ? `&year=${year}` : ""}`
    );
    return new response.data();
  } catch (error) {
    throw new ApiError("Failed to fetch events");
  }
}
