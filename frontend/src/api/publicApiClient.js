import axios from "axios";

export const publicApiClient = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:5000/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

export const getPublicApiErrorMessage = (error) => {
  const code = error.response?.data?.code;
  const message =
    error.response?.data?.message ||
    error.message ||
    "Request failed";

  return code ? `${code}: ${message}` : message;
};