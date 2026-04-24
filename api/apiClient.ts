import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.219.41:4000';

export const ACCESS_TOKEN_KEY = 'access_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';
const DEVICE_ID_KEY = 'device_id';

// SecureStore 헬퍼
export const tokenStorage = {
  get: () => SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
  set: (token: string) => SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token),
  remove: () => SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
  setRefresh: (token: string) => SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token),
  getRefresh: () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  removeRefresh: () => SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  clearAll: async () => {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  },
};

// 앱 설치 시 한 번 생성하고 계속 재사용하는 기기 고유 ID
export const getOrCreateDeviceId = async (): Promise<string> => {
  let id = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (!id) {
    id = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`;
    await SecureStore.setItemAsync(DEVICE_ID_KEY, id);
  }
  return id;
};

export const apiClient = axios.create({
  baseURL: `${BASE_URL}/api`,
});

// 요청마다 저장된 토큰을 Authorization 헤더에 자동으로 붙여줌
apiClient.interceptors.request.use(async (config) => {
  const token = await tokenStorage.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 동시에 여러 요청이 401을 받아도 토큰 재발급은 한 번만
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

function processQueue(error: unknown) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(undefined);
  });
  failedQueue = [];
}

// 401 에러 시 토큰 재발급 후 원래 요청 재시도
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(() => apiClient(originalRequest))
        .catch(() => Promise.reject(error));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = await tokenStorage.getRefresh();
      const res = await axios.post(`${BASE_URL}/api/auth/token-check`, { refreshToken });
      const { accessToken, refreshToken: newRefreshToken } = res.data ?? {};
      if (accessToken) {
        await tokenStorage.set(accessToken);
      }
      if (newRefreshToken) {
        await tokenStorage.setRefresh(newRefreshToken);
      }

      processQueue(null);
      return apiClient(originalRequest);
    } catch (refreshErr) {
      processQueue(refreshErr);
      await tokenStorage.clearAll();
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  }
);
