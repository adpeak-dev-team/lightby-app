// 오늘의 운세 타입 (웹 services/fortune/types와 동일)

export interface Zodiac {
  key?: string;
  name: string;
  emoji: string;
  years: number[];
}

export interface TodayFortune {
  zodiac: string;
  emoji: string;
  date: string; // YYYY-MM-DD
  score: number; // 0~100
  total: string;
  money: string;
  love: string;
  advice: string | null;
  luckyColor: string | null;
  luckyNumber: number | null;
}
