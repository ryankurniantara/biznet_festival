// Pilih environment yang dipakai sekarang
const ENV = "local"; // "local" | "production" | "development"

const BASE_URLS = {
  local: "http://192.168.134.64:8000/api/festival",
  production: "https://mybiznet.biznetform.com/",
  development: "http://api-dev-v2.biznetnetworks.com",
};

export const API_CONFIG = {
  BASE_URL: BASE_URLS[ENV],
  TIMEOUT: 10000, // ms
};
