import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/apiClient';

export interface MeResponse {
  id: number;
  nickname: string;
  role: string;
  name?: string;
}

export function useGetMe() {
  return useQuery<MeResponse | null>({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await apiClient.get('/auth/getme');
      return data ?? null;
    },
    retry: false,
  });
}
