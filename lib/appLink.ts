import { Linking } from 'react-native';
import type { useRouter } from 'expo-router';

import { WEB_URL } from '@/lib/constants';

/**
 * 어드민에 적힌 링크(배너·팝업)를 앱에서 어디로 보낼지 정한다.
 *
 * 어드민은 웹 주소 하나만 입력한다(https://lightby.co.kr/fortune 처럼). 그대로 열면
 * 앱 안에서 웹뷰/브라우저가 떠서, 앱에 같은 화면이 있는데도 로그인부터 다시 하게 된다.
 * 그래서 우리 도메인의 주소는 **앱 화면으로 바꿔서** 이동한다.
 *
 * 우리 주소가 아니면 원래대로 브라우저로 보낸다. 앱 설치 안내처럼 앱에서 열 것이
 * 없는 주소는 아무것도 하지 않는다.
 */
export type LinkTarget =
    | { kind: 'route'; pathname: string; params?: Record<string, string> }
    | { kind: 'external'; url: string }
    | { kind: 'ignore' };

/** 우리 웹 호스트 — 이 호스트의 주소만 앱 화면으로 바꾼다 */
const WEB_HOSTS = new Set(
    [WEB_URL, 'https://lightby.co.kr', 'https://www.lightby.co.kr']
        .map(hostOf)
        .filter((h): h is string => !!h),
);

function hostOf(url: string): string | null {
    const m = /^[a-z][a-z0-9+.-]*:\/\/([^/?#]+)/i.exec(url.trim());
    return m ? m[1].toLowerCase().replace(/:\d+$/, '') : null;
}

/**
 * 웹 경로 → 앱 경로. 경로 이름이 다른 것들만 적는다.
 * (웹 /fortune = 앱 /saju, 웹 /card = 앱 명함 탭)
 */
const PATH_MAP: Record<string, string> = {
    '/fortune': '/saju',
    '/fortune/today': '/saju/today',
    '/fortune/saju': '/saju/natal',
    '/fortune/match': '/saju/match',
    '/fortune/monthly': '/saju/monthly',
    '/card': '/(tabs)/card',
    '/card/new': '/card/new',
    '/community': '/(tabs)/community',
    '/favorite': '/(tabs)/favorite',
    '/my': '/(tabs)/my',
    '/mypage/point': '/mypage/point',
    '/mypage/point/charge': '/mypage/point-charge',
    '/mypage/post': '/mypage/post',
    '/mypage/talent': '/mypage/talent',
    '/mypage/support': '/mypage/support',
    '/registration/site-post': '/registration/sitepost',
    '/registration/community-post': '/registration/communitypost',
    '/': '/',
    // 웹·앱 경로가 같은 화면들 (여기 없으면 웹으로 열린다)
    '/terms': '/terms',
    '/mypage/account': '/mypage/account',
    '/mypage/settings': '/mypage/settings',
    '/mypage/notifications': '/mypage/notifications',
    '/mypage/application-status': '/mypage/application-status',
    '/mypage/applicant-management': '/mypage/applicant-management',
};

/** 앱에서 열 것이 없는 경로 — 앱 설치 안내, 웹 전용 결제 페이지 */
const IGNORED = [/^\/app-download/, /^\/payment\//, /^\/open$/];

/** /posts/site/123 처럼 id 가 붙는 경로 */
const DYNAMIC: { test: RegExp; pathname: string }[] = [
    { test: /^\/posts\/site\/(\d+)$/, pathname: '/posts/site/[id]' },
    { test: /^\/posts\/board\/(\d+)$/, pathname: '/posts/board/[id]' },
];

export function resolveLink(raw: string | null | undefined): LinkTarget {
    const url = (raw ?? '').trim();
    if (!url) return { kind: 'ignore' };

    const host = hostOf(url);
    // 스킴이 있는데 우리 호스트가 아니면 그대로 브라우저로 (kakao.com, play store 등)
    if (host && !WEB_HOSTS.has(host)) return { kind: 'external', url };
    // 스킴도 없고 / 로 시작하지도 않으면 우리 경로로 볼 수 없다
    if (!host && !url.startsWith('/')) return { kind: 'external', url };

    const path = normalize(host ? url.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]+/i, '') : url);

    if (IGNORED.some((re) => re.test(path))) return { kind: 'ignore' };

    for (const { test, pathname } of DYNAMIC) {
        const m = test.exec(path);
        if (m) return { kind: 'route', pathname, params: { id: m[1] } };
    }

    const mapped = PATH_MAP[path];
    if (mapped) return { kind: 'route', pathname: mapped };

    // 앱에 같은 화면이 있는 경로는 그대로 쓴다 (/terms, /mypage/... 등)
    // 없는 경로는 웹으로 — 앱에 없는 화면을 push 하면 빈 화면이 된다
    return { kind: 'external', url: host ? url : `${WEB_URL}${url}` };
}

/** 앞뒤 정리: 쿼리·해시 제거, 끝의 / 제거, 소문자 */
function normalize(pathname: string): string {
    const path = pathname.split(/[?#]/)[0].toLowerCase();
    if (path === '') return '/';
    return path.length > 1 ? path.replace(/\/+$/, '') : path;
}

/**
 * 배너·팝업 링크를 연다. 앱 화면이면 앱 안에서, 아니면 브라우저로.
 */
export function openLink(router: ReturnType<typeof useRouter>, raw: string | null | undefined) {
    const target = resolveLink(raw);
    try {
        if (target.kind === 'route') {
            if (target.params) {
                router.push({ pathname: target.pathname, params: target.params } as never);
            } else {
                router.push(target.pathname as never);
            }
        } else if (target.kind === 'external') {
            Linking.openURL(target.url).catch(() => null);
        }
    } catch {
        // 라우팅이 실패해도 앱이 멈추지 않게 — 링크 하나 때문에 화면이 죽을 이유는 없다
    }
}

/** 눌렀을 때 아무 일도 없을 링크인지 (터치 피드백을 줄지 결정) */
export function isLinkOpenable(raw: string | null | undefined): boolean {
    return resolveLink(raw).kind !== 'ignore';
}
