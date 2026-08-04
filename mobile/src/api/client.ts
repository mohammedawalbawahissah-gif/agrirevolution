import axios from "axios";
import * as SecureStore from "expo-secure-store";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Refresh mutex: prevents concurrent requests from each firing their own
// refresh call when the access token expires (same fix applied in FarmAsyst).
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = await SecureStore.getItemAsync("refresh_token");
  if (!refreshToken) throw new Error("No refresh token available");

  const { data } = await axios.post(`${API_BASE_URL}/accounts/token/refresh/`, {
    refresh: refreshToken,
  });
  await SecureStore.setItemAsync("access_token", data.access);
  return data.access;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null;
          });
        }
        const newAccessToken = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch {
        await SecureStore.deleteItemAsync("access_token");
        await SecureStore.deleteItemAsync("refresh_token");
        // Navigation to login screen handled by the auth context listening for this
      }
    }
    return Promise.reject(error);
  }
);
