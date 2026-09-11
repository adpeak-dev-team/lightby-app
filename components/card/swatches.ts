import type { TemplateId } from '@/services/card/types';

/**
 * 템플릿 대표색 (시작색, 끝색).
 *
 * 웹 templates.tsx 의 `swatch` 와 **같은 값**이다. 목록 썸네일이 웹과 앱에서
 * 다른 색으로 보이면 같은 명함으로 안 보인다. 웹 쪽 swatch 를 바꾸면 여기도 바꾼다.
 * (웹은 CSS linear-gradient 문자열이라 그대로 못 가져온다 — 두 색만 옮겨 둔다)
 */
export const TEMPLATE_SWATCH: Record<TemplateId, [string, string]> = {
    minimal: ['#ffffff', '#e2e8f0'],
    navy: ['#0f1f3d', '#c9a227'],
    lightning: ['#2563eb', '#4338ca'],
    dark: ['#171717', '#525252'],
    warm: ['#faf5ee', '#c8ab8c'],
    luxe: ['#000000', '#bf9b30'],
    aurora: ['#7c3aed', '#fb7185'],
    sidebar: ['#2563eb', '#06b6d4'],
    fresh: ['#10b981', '#14b8a6'],
    photo: ['#0f172a', '#64748b'],
};
