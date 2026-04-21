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

export async function signIn(body: SignInRequest): Promise<SignInResponse> {
  const res = await apiClient.post<SignInResponse>('/auth/sign-in', body);
  return res.data;
}
