import type { TemplateId } from '@/services/card/types';

/**
 * 템플릿 목록 — 웹 `templates.tsx` 의 id · name · hint · swatch 와 **같은 값**이다.
 *
 * 실제로 그리는 건 웹 렌더러 하나뿐이고(앱은 WebView 로 미리보기를 띄운다),
 * 여기 있는 건 고르는 화면에 쓰는 이름표와 대표색이다. 색이 웹과 다르면
 * 고를 때 본 것과 완성된 명함이 달라 보인다 — 웹 swatch 를 바꾸면 여기도 바꾼다.
 * (웹은 CSS linear-gradient 문자열이라 그대로 못 가져온다 — 두 색만 옮겨 둔다)
 */
export const TEMPLATES: {
    id: TemplateId;
    name: string;
    hint: string;
    colors: [string, string];
}[] = [
    { id: 'minimal', name: '미니멀', hint: '어디에도 안 튀는 기본', colors: ['#ffffff', '#e2e8f0'] },
    { id: 'navy', name: '네이비 클래식', hint: '신뢰감 · 격식', colors: ['#0f1f3d', '#c9a227'] },
    { id: 'lightning', name: '번개 블루', hint: '번개분양 브랜드', colors: ['#2563eb', '#4338ca'] },
    { id: 'dark', name: '모던 다크', hint: '이름을 크게', colors: ['#171717', '#525252'] },
    { id: 'warm', name: '소프트 베이지', hint: '부드러운 상담 인상', colors: ['#faf5ee', '#c8ab8c'] },
    { id: 'luxe', name: '골드 라인', hint: '하이엔드 현장', colors: ['#000000', '#bf9b30'] },
    { id: 'aurora', name: '오로라', hint: '젊고 감각적인', colors: ['#7c3aed', '#fb7185'] },
    { id: 'sidebar', name: '사이드바', hint: '정보량이 많을 때', colors: ['#2563eb', '#06b6d4'] },
    { id: 'fresh', name: '프레시', hint: '신규 · 오픈 현장', colors: ['#10b981', '#14b8a6'] },
    { id: 'photo', name: '포토', hint: '얼굴을 먼저', colors: ['#0f172a', '#64748b'] },
];

/** 목록 썸네일처럼 색만 필요한 곳을 위한 조회표 */
export const TEMPLATE_SWATCH = Object.fromEntries(
    TEMPLATES.map((t) => [t.id, t.colors]),
) as Record<TemplateId, [string, string]>;
