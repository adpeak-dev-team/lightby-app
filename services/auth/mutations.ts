import { useMutation } from '@tanstack/react-query';
import { tokenStorage } from '@/api/apiClient';
import {
  signIn, SignInRequest,
  signUp, SignUpRequest,
  checkLoginId, checkNickname,
  sendOtp, verifyOtp,
  logout,
  oauthKakaoSignIn, OAuthKakaoSignInResponse,
  oauthSignUp, OAuthSignUpRequest,
  verifyPhoneAuth,
  findPasswordSendOtp,
  resetPassword,
} from './api';

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
      // needsPhoneAuth인 경우 토큰이 없으므로 저장하지 않음
      if (!data.needsPhoneAuth && data.accessToken) {
        await tokenStorage.set(data.accessToken);
        await tokenStorage.setRefresh(data.refreshToken);
      }
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

export function useOAuthKakaoSignIn() {
  return useMutation({
    mutationFn: ({ kakaoAccessToken, deviceId }: { kakaoAccessToken: string; deviceId: string }) =>
      oauthKakaoSignIn(kakaoAccessToken, deviceId),
    onSuccess: async (data: OAuthKakaoSignInResponse) => {
      // 로그인 완료된 경우만 토큰 저장
      if (data.accessToken && data.refreshToken) {
        await tokenStorage.set(data.accessToken);
        await tokenStorage.setRefresh(data.refreshToken);
      }
    },
  });
}

export function useOAuthSignUp() {
  return useMutation({
    mutationFn: (body: OAuthSignUpRequest) => oauthSignUp(body),
    onSuccess: async (data) => {
      await tokenStorage.set(data.accessToken);
      await tokenStorage.setRefresh(data.refreshToken);
    },
  });
}

export function useVerifyPhoneAuth() {
  return useMutation({
    mutationFn: ({ userId, phone, otpCode }: { userId: number; phone: string; otpCode: string }) =>
      verifyPhoneAuth(userId, phone, otpCode),
  });
}

export function useFindPasswordSendOtp() {
  return useMutation({
    mutationFn: ({ loginId, phone }: { loginId: string; phone: string }) =>
      findPasswordSendOtp(loginId, phone),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({
      loginId, phone, otpCode, newPassword,
    }: {
      loginId: string; phone: string; otpCode: string; newPassword: string;
    }) => resetPassword(loginId, phone, otpCode, newPassword),
  });
}
