/**
 * 앱 전역 디자인 토큰 — lightby-front(웹, Tailwind v4) 디자인 시스템에 1:1로 맞춤.
 *
 * 웹 기준(globals.css / Tailwind):
 *  - 폰트: Pretendard Variable
 *  - 브랜드 primary: blue 팔레트 (#3b82f6 = blue-500 기본, 강조 #2563eb = blue-600)
 *  - 중립: slate 스케일
 *  - 배경: #f8fafc (slate-50), 카드: #ffffff + slate-100 보더(그림자 없는 플랫)
 *  - 시맨틱: danger #ef4444 / success #10b981 / warning #f59e0b
 * 신규 스타일은 하드코딩 대신 이 토큰을 사용한다.
 */

// ── primary(blue) 팔레트 — 웹 --color-primary-* 와 동일 ──
export const Primary = {
  50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa',
  500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a', 950: '#172554',
} as const;

// ── slate 중립 스케일 — Tailwind slate 와 동일 ──
export const Slate = {
  50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8',
  500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a', 950: '#020617',
} as const;

export const Colors = {
  // ── 브랜드(blue) ──
  primary: Primary[500], // #3b82f6 — 메인 액션/버튼
  primaryDark: Primary[600], // #2563eb — 강조 텍스트(수수료 등)
  primaryLight: Primary[400], // #60a5fa
  primarySoft: Primary[50], // #eff6ff — 연한 배경(활성 칩 등)
  point: Primary[600], // 선택된 칩/필터/지역 활성 (웹 filter-chip-active 톤)

  // ── 네비게이션 ──
  tabActive: Primary[500], // #3b82f6
  tabInactive: Slate[400], // #94a3b8

  // ── FAB 그라데이션 ──
  fabGradient: [Primary[500], Primary[600]] as const, // #3b82f6 → #2563eb

  // ── 텍스트 위계 (slate) ──
  text: Slate[900], // #0f172a — 제목/본문 강조
  textSub: Slate[500], // #64748b — 보조 텍스트
  textMuted: Slate[400], // #94a3b8 — placeholder/메타
  textFaint: Slate[300], // #cbd5e1 — 구분점 등

  // ── 배경/보더 ──
  bg: '#ffffff',
  bgMuted: Slate[50], // #f8fafc — 페이지 배경
  bgGray: Slate[100], // #f1f5f9 — 입력/회색 배경
  border: Slate[100], // #f1f5f9 — 카드 보더/디바이더
  borderStrong: Slate[200], // #e2e8f0

  // ── 상태/의미 색 (웹과 동일) ──
  danger: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
  like: '#ef4444', // 좋아요(하트)
  comment: Primary[500], // 댓글 (웹 text-blue-500)
  location: '#b45309', // amber-700 — 위치 텍스트(웹 JobCard와 동일)
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

// 웹 Tailwind radius: lg=8 / xl=12 / 2xl=16, 버튼=16
export const Radius = {
  sm: 6,
  md: 8, // rounded-lg
  lg: 12, // rounded-xl — JobCard 등
  xl: 16, // rounded-2xl — 버튼/CommunityCard 등
  pill: 999,
} as const;

// 웹에서 실제 쓰는 px 사이즈에 맞춤(text-[9~11px]·xs12·sm14·base16·lg18·xl20)
export const FontSize = {
  xxs: 9,
  xs: 11,
  sm: 12,
  base: 14,
  md: 15,
  lg: 16,
  xl: 18,
  xxl: 20,
  xxxl: 24,
} as const;

// 웹 font-weight: medium500 / semibold600 / bold700 / extrabold800
export const FontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} as const;

// Pretendard 로드 시 적용할 기본 폰트 패밀리 키(미로드 시 시스템 폰트로 폴백)
export const FontFamily = {
  regular: 'Pretendard',
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
