import { apiClient } from '@/api/apiClient';

export interface SignInRequest {
  loginId: string;
  password: string;
  deviceId: string;
}

export interface SignInResponse {
  accessToken: string;
  refreshToken: string;
  id: number;
  role: string;
  needsPhoneAuth: boolean;
}

export interface SignUpRequest {
  loginId: string;
  name: string;
  nickname: string;
  phone: string;
  password: string;
  deviceId: string;
  joinRoutes: string;
}

export interface SignUpResponse {
  id: number;
  role: string;
  accessToken: string;
  refreshToken: string;
}

export interface OAuthKakaoSignInResponse {
  // 시나리오 1: 기존 사용자 로그인 완료
  accessToken?: string;
  refreshToken?: string;
  id?: number;
  role?: string;
  // 시나리오 2: 기존 사용자, 전화번호 인증 필요
  isExistingUser?: boolean;
  needsPhoneAuth?: boolean;
  userId?: number;
  // 시나리오 3: 신규 사용자
  isNewUser?: boolean;
  kakaoProfile?: {
    snsId: string;
    name: string;
    nickname: string;
    phone: string | null;
    profileImage: string | null;
    thumbnailImage: string | null;
  };
  conflicts?: {
    isNicknameDuplicate: boolean;
    isPhoneDuplicate: boolean;
    isNicknameMissing: boolean;
    isPhoneMissing: boolean;
  };
}

export interface OAuthSignUpRequest {
  snsId: string;
  snsType: string;
  name: string;
  nickname: string;
  phone: string;
  profileImage: string | null;
  thumbnailImage: string | null;
  deviceId: string;
}

export interface OAuthSignUpResponse {
  id: number;
  role: string;
  accessToken: string;
  refreshToken: string;
}

export async function signUp(body: SignUpRequest): Promise<SignUpResponse> {
  const res = await apiClient.post<SignUpResponse>('/auth/sign-up', body);
  return res.data;
}

export async function signIn(body: SignInRequest): Promise<SignInResponse> {
  const res = await apiClient.post<SignInResponse>('/auth/sign-in', body);
  return res.data;
}

export async function checkLoginId(loginId: string): Promise<void> {
  await apiClient.post('/auth/id-duplicate-chk', { loginId });
}

export async function checkNickname(nickname: string): Promise<void> {
  await apiClient.post('/auth/nickname-duplicate-chk', { nickname });
}

export async function sendOtp(phone: string): Promise<void> {
  await apiClient.post('/auth/send/otp', { phone });
}

export async function verifyOtp(phone: string, otpCode: string): Promise<void> {
  await apiClient.post('/auth/verify/otp', { phone, otpCode });
}

export async function logout(refreshToken: string): Promise<void> {
  await apiClient.post('/auth/logout', { refreshToken });
}

export async function oauthKakaoSignIn(
  kakaoAccessToken: string,
  deviceId: string,
): Promise<OAuthKakaoSignInResponse> {
  const res = await apiClient.post<OAuthKakaoSignInResponse>(
    '/auth/sign-in/oauth/kakao/app',
    { kakaoAccessToken, deviceId },
  );
  return res.data;
}

export async function oauthSignUp(body: OAuthSignUpRequest): Promise<OAuthSignUpResponse> {
  const res = await apiClient.post<OAuthSignUpResponse>('/auth/sign-up/oauth', body);
  return res.data;
}

export async function verifyPhoneAuth(
  userId: number,
  phone: string,
  otpCode: string,
): Promise<void> {
  await apiClient.post('/auth/verify-phone-auth', { userId, phone, otpCode });
}

export async function findPasswordSendOtp(loginId: string, phone: string): Promise<void> {
  await apiClient.post('/auth/find-password/send-otp', { loginId, phone });
}

export async function resetPassword(
  loginId: string,
  phone: string,
  otpCode: string,
  newPassword: string,
): Promise<void> {
  await apiClient.post('/auth/find-password/reset', { loginId, phone, otpCode, newPassword });
}
