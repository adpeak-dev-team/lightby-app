import { QueryClient } from '@tanstack/react-query';

/**
 * 앱 전역 QueryClient 싱글턴.
 *
 * RootLayout이 아니라 별도 모듈에 두는 이유:
 * 푸시 수신 리스너처럼 QueryClientProvider "밖"(RootLayout 본문)에서 도는 코드가
 * useQueryClient() 없이 캐시를 무효화해야 하기 때문이다.
 */
export const queryClient = new QueryClient();
