import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.219.43:4000';

export const ACCESS_TOKEN_KEY = 'access_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';
const DEVICE_ID_KEY = 'device_id';

// 플랫폼별 보안 저장소: 네이티브는 SecureStore, 웹은 localStorage 사용
// (expo-secure-store 는 웹에서 동작하지 않음)
const isWeb = Platform.OS === 'web';

const secureStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (isWeb) {
      try {
        return globalThis.localStorage?.getItem(key) ?? null;
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (isWeb) {
      try {
        globalThis.localStorage?.setItem(key, value);
      } catch {
        /* no-op */
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (isWeb) {
      try {
        globalThis.localStorage?.removeItem(key);
      } catch {
        /* no-op */
      }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

// 토큰 저장소 헬퍼
export const tokenStorage = {
  get: () => secureStorage.getItem(ACCESS_TOKEN_KEY),
  set: (token: string) => secureStorage.setItem(ACCESS_TOKEN_KEY, token),
  remove: () => secureStorage.removeItem(ACCESS_TOKEN_KEY),
  setRefresh: (token: string) => secureStorage.setItem(REFRESH_TOKEN_KEY, token),
  getRefresh: () => secureStorage.getItem(REFRESH_TOKEN_KEY),
  removeRefresh: () => secureStorage.removeItem(REFRESH_TOKEN_KEY),
  clearAll: async () => {
    await secureStorage.removeItem(ACCESS_TOKEN_KEY);
    await secureStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

// 앱 설치 시 한 번 생성하고 계속 재사용하는 기기 고유 ID
export const getOrCreateDeviceId = async (): Promise<string> => {
  let id = await secureStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`;
    await secureStorage.setItem(DEVICE_ID_KEY, id);
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

    // 로그인/회원가입/OTP 등 인증 엔드포인트의 401은 "토큰 만료"가 아니라
    // 자격 증명 오류이므로 리프레시/리다이렉트를 타지 않고 호출부로 그대로 전달
    const reqUrl = originalRequest?.url ?? '';
    const isAuthRoute = reqUrl.includes('/auth/');

    if (error.response?.status !== 401 || originalRequest._retry || isAuthRoute) {
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
      // 세션 만료: 로그인 화면으로 이동 (웹/네이티브 공통)
      try { router.replace('/auth/login'); } catch { /* 라우터 미준비 시 무시 */ }
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  }
);
