import { API_CONFIG } from "../config.js";
import { ApiError, apiFetch } from "../response.js";

export async function postProfile(params) {
  const url = `${API_CONFIG.BASE_URL}/post-profile`;
  try {
    const res = await apiFetch(url, {
      method: "POST",
      showAlert: true,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("visitor_token")}`,
      },
      body: JSON.stringify(params),
    });
    return res.data;
  } catch (err) {
    throw ApiError.fromNetwork(err, url, "POST");
  }
}

export async function getProvinces() {
  const url = `${API_CONFIG.BASE_URL}/master_province`;
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

export async function getCities(provinceId) {
  const url = `${API_CONFIG.BASE_URL}/master_city?province_id=${provinceId}`;

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

export async function getDistricts(cityId) {
  const url = `${API_CONFIG.BASE_URL}/master_district?city_id=${cityId}`; // Adjust endpoint as necessary
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

export async function getSubDistricts(districtId) {
  const url = `${API_CONFIG.BASE_URL}/master_subdistrict?district_id=${districtId}`;
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

export async function checkCustomerNumber(customerNumber) {
  const url = `${API_CONFIG.BASE_URL}/ckCustNum`;
  try {
    const res = await apiFetch(url, {
      method: "POST",
      showAlert: false,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ idcust: customerNumber }),
    });
    return res.message; // Assuming the API returns { message: "..." }
  } catch (err) {
    throw ApiError.fromNetwork(err, url, "POST");
  }
}
