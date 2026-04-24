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
