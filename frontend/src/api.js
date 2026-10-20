import axios from "axios";

// Same-origin via the Vite proxy; Axios sends the XSRF-TOKEN cookie back as X-XSRF-TOKEN automatically.
import mockAdapter from "./mock.js";

const axiosClient = axios.create({
  baseURL: "/api",
  adapter: import.meta.env.VITE_MOCK ? mockAdapter : undefined,
});

export const errorMessage = (e) => e.response?.data?.error ?? "Request failed";

export default axiosClient;
