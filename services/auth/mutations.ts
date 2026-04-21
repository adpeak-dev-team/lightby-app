import { useMutation } from '@tanstack/react-query';
import { tokenStorage } from '@/api/apiClient';
import { signIn, SignInRequest } from './api';

export const REFRESH_TOKEN_KEY = 'refresh_token';

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
