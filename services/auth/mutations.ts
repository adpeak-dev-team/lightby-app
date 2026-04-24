import { useMutation } from '@tanstack/react-query';
import { tokenStorage } from '@/api/apiClient';
import { signIn, SignInRequest, signUp, SignUpRequest, checkLoginId, checkNickname, sendOtp, verifyOtp, logout } from './api';

export const REFRESH_TOKEN_KEY = 'refresh_token';

export function useSignUp() {
  return useMutation({
    mutationFn: (body: SignUpRequest) => signUp(body),
    onSuccess: async (data) => {
      await tokenStorage.set(data.accessToken);
      await tokenStorage.setRefresh(data.refreshToken);
    },
  });
}

export function useCheckLoginId() {
  return useMutation({
    mutationFn: (loginId: string) => checkLoginId(loginId),
  });
}

export function useCheckNickname() {
  return useMutation({
    mutationFn: (nickname: string) => checkNickname(nickname),
  });
}

export function useSendOtp() {
  return useMutation({
    mutationFn: (phone: string) => sendOtp(phone),
  });
}

export function useVerifyOtp() {
  return useMutation({
    mutationFn: ({ phone, otpCode }: { phone: string; otpCode: string }) =>
      verifyOtp(phone, otpCode),
  });
}

export function useSignIn() {
  return useMutation({
    mutationFn: (body: SignInRequest) => signIn(body),
    onSuccess: async (data) => {
      // 토큰 SecureStore에 저장
      await tokenStorage.set(data.accessToken);
      await tokenStorage.setRefresh(data.refreshToken);
    },
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      const refreshToken = await tokenStorage.getRefresh();
      await logout(refreshToken ?? '');
    },
    onSettled: async () => {
      await tokenStorage.clearAll();
    },
  });
}
