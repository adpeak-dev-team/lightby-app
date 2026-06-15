import { useQuery } from '@tanstack/react-query';
import { getZodiacs, getTodayFortune } from './api';

export const FORTUNE_QUERY_KEYS = {
  zodiacs: ['fortune-zodiacs'] as const,
  today: (zodiac: string) => ['fortune-today', zodiac] as const,
};

// 띠 목록
export const useGetZodiacs = () =>
  useQuery({
    queryKey: FORTUNE_QUERY_KEYS.zodiacs,
    queryFn: getZodiacs,
    staleTime: 1000 * 60 * 60, // 띠 목록은 거의 변하지 않음
  });

// 선택한 띠의 오늘 운세 — zodiac이 있을 때만 호출
export const useGetTodayFortune = (zodiac: string | null) =>
  useQuery({
    queryKey: FORTUNE_QUERY_KEYS.today(zodiac ?? ''),
    queryFn: () => getTodayFortune(zodiac as string),
    enabled: !!zodiac,
    staleTime: 1000 * 60 * 30,
  });
