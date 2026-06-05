/**
 * 앱 전역 디자인 토큰 — lightby-front(웹) 디자인 시스템에 맞춤.
 *
 * 웹 기준 색상:
 *  - 메인 액션: sky-500(#0ea5e9), 강조 텍스트: sky-600(#0284c7)
 *  - 포인트(선택/필터/지역 활성): teal #007595
 *  - 하단탭 활성: #61a2ff / 비활성: #868686
 *  - FAB: 그라데이션 #5587ED → #4876D6
 * 신규 스타일은 하드코딩 대신 이 토큰을 사용한다.
 */

export const Colors = {
  // ── 브랜드 ──
  primary: '#0ea5e9', // sky-500 — 메인 액션/버튼
  primaryDark: '#0284c7', // sky-600 — 강조 텍스트(수수료 등)
  primaryLight: '#38bdf8', // sky-400
  primarySoft: '#e0f2fe', // sky-100 — 연한 배경
  point: '#007595', // teal — 선택된 칩/필터/지역 활성

  // ── 네비게이션 ──
  tabActive: '#61a2ff',
  tabInactive: '#868686',

  // ── FAB 그라데이션 ──
  fabGradient: ['#5587ED', '#4876D6'] as const,

  // ── 텍스트 위계 ──
  text: '#111827', // gray-900 — 제목/본문 강조
  textSub: '#6b7280', // gray-500 — 보조 텍스트
  textMuted: '#9ca3af', // gray-400 — placeholder/메타
  textFaint: '#d1d5db', // gray-300 — 구분점 등

  // ── 배경/보더 ──
  bg: '#ffffff',
  bgMuted: '#f9fafb', // gray-50
  bgGray: '#f3f4f6', // gray-100 — 페이지 회색 배경/입력 배경
  border: '#f3f4f6', // gray-100 — 카드 보더/디바이더
  borderStrong: '#e5e7eb', // gray-200

  // ── 상태/의미 색 ──
  danger: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
  like: '#ef4444', // 좋아요(하트)
  comment: '#3b82f6', // 댓글 (웹 text-blue-500과 동일)
  location: '#b45309', // amber-700 — 위치 텍스트
  white: '#ffffff',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16, // 표준 페이지 좌우 여백 (웹 px-4)
  xl: 20,
  xxl: 24,
} as const;

export const Radius = {
  sm: 6,
  md: 10,
  lg: 12, // JobCard 등
  xl: 16, // CommunityCard 등
  pill: 999,
} as const;

export const FontSize = {
  xs: 11,
  sm: 12,
  base: 13,
  md: 14,
  lg: 15,
  xl: 17,
  xxl: 22,
} as const;

/** 플랫(평면) 카드 — 웹 디자인은 그림자 없이 보더로만 구분 */
export const flatCard = {
  backgroundColor: Colors.bg,
  borderWidth: 1,
  borderColor: Colors.border,
} as const;

export const Shadow = {
  /** FAB 등 떠 있는 요소용 */
  fab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
} as const;
