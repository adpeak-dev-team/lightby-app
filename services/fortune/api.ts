import { apiClient } from '@/api/apiClient';
import type { Zodiac, TodayFortune } from './types';

// 띠 목록 조회
export async function getZodiacs(): Promise<Zodiac[]> {
  const res = await apiClient.get<{ success: boolean; data: Zodiac[] }>('/fortune/zodiacs');
  return res.data.data;
}

// 선택한 띠의 오늘 운세
export async function getTodayFortune(zodiac: string): Promise<TodayFortune> {
  const res = await apiClient.get<{ success: boolean; data: TodayFortune }>('/fortune/today', {
    params: { zodiac },
  });
  return res.data.data;
}
