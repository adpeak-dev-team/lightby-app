import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tokenStorage } from '@/api/apiClient';
import { registerForPushNotifications } from '@/services/push/register';
import {
  signIn, SignInRequest,
  signUp, SignUpRequest,
  checkLoginId, checkNickname,
  sendOtp, verifyOtp,
  logout,
  oauthKakaoSignIn, OAuthKakaoSignInResponse,
  oauthAppleSignIn, OAuthSignInResponse,
  oauthSignUp, OAuthSignUpRequest,
  verifyPhoneAuth,
  findPasswordSendOtp,
  resetPassword,
  recoverAccount, RecoverAccountRequest,
  discardWithdrawnAccount, DiscardWithdrawnRequest,
} from './api';

export const REFRESH_TOKEN_KEY = 'refresh_token';

// 로그인/가입으로 토큰이 새로 저장되면 푸시 토큰을 user_id와 재연결한다.
// (부팅 시 비로그인 상태로 등록됐던 기기를 로그인 계정에 묶기 위함 — 안 하면
//  갓 로그인한 유저의 기기는 user_id=NULL로 남아 sendToUser 대상에서 빠진다.)
async function persistAuthTokens(accessToken: string, refreshToken: string) {
  await tokenStorage.set(accessToken);
  await tokenStorage.setRefresh(refreshToken);
  // fire-and-forget: 로그인 응답을 막지 않음
  void registerForPushNotifications();
}

export function useSignUp() {
  return useMutation({
    mutationFn: (body: SignUpRequest) => signUp(body),
    onSuccess: async (data) => {
      await persistAuthTokens(data.accessToken, data.refreshToken);
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
        await persistAuthTokens(data.accessToken, data.refreshToken);
      }
    },
  });
}

// 탈퇴 유예 기간 내 계정 복구. 서버가 복구와 동시에 토큰을 발급하므로 바로 로그인 상태가 된다.
export function useRecoverAccount() {
  return useMutation({
    mutationFn: (body: RecoverAccountRequest) => recoverAccount(body),
    onSuccess: async (data) => {
      if (data.accessToken && data.refreshToken) {
        await persistAuthTokens(data.accessToken, data.refreshToken);
      }
    },
  });
}

// 탈퇴 유예 기간 내 계정 즉시 파기 (새 계정으로 재가입). 토큰은 발급되지 않는다.
export function useDiscardWithdrawnAccount() {
  return useMutation({
    mutationFn: (body: DiscardWithdrawnRequest) => discardWithdrawnAccount(body),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const refreshToken = await tokenStorage.getRefresh();
      await logout(refreshToken ?? '');
    },
    onSettled: async () => {
      await tokenStorage.clearAll();
      // 이전 사용자 데이터가 남지 않도록 캐시 전체 정리
      qc.clear();
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
        await persistAuthTokens(data.accessToken, data.refreshToken);
      }
    },
  });
}

export function useOAuthAppleSignIn() {
  return useMutation({
    mutationFn: ({ identityToken, deviceId, name, authorizationCode }: { identityToken: string; deviceId: string; name?: string; authorizationCode?: string }) =>
      oauthAppleSignIn(identityToken, deviceId, name, authorizationCode),
    onSuccess: async (data: OAuthSignInResponse) => {
      // 로그인 완료된 경우만 토큰 저장
      if (data.accessToken && data.refreshToken) {
        await persistAuthTokens(data.accessToken, data.refreshToken);
      }
    },
  });
}

export function useOAuthSignUp() {
  return useMutation({
    mutationFn: (body: OAuthSignUpRequest) => oauthSignUp(body),
    onSuccess: async (data) => {
      await persistAuthTokens(data.accessToken, data.refreshToken);
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
