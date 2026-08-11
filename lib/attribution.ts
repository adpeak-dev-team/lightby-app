import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { apiClient, getOrCreateDeviceId, setRequestAttributionId } from '@/api/apiClient';

/**
 * 앱 유입 Attribution — 웹에서 시작된 광고 유입을 앱 설치 이후까지 잇는다(Deferred Deep Link).
 *
 * 광고 → 웹 → 스토어 → 설치 → 첫 실행 구간에서 쿠키가 끊긴다. 그래서 앱 최초 실행 때
 * 단서(딥링크 / Android 설치 리퍼러 / IP 시각)를 서버로 보내 방문자 식별자를 되찾는다.
 *
 * 되찾은 식별자는 이후 모든 요청에 x-attribution-id 헤더로 실려, 회원가입 시 유입원으로 붙는다.
 */

const ATTRIBUTION_ID_KEY = 'lb_aid';
/** 최초 실행 매칭을 이미 했는지 — 앱을 열 때마다 매칭을 다시 돌리면 유입원이 흔들린다. */
const APP_OPEN_DONE_KEY = 'lb_app_open_done';

/** 방문자 식별자. 메모리 캐시는 요청 인터셉터가 매번 스토리지를 읽지 않도록 두는 것. */
let cachedAttributionId: string | null = null;

export function getCachedAttributionId(): string | null {
    return cachedAttributionId;
}

export async function loadAttributionId(): Promise<string | null> {
    if (cachedAttributionId) return cachedAttributionId;
    try {
        cachedAttributionId = await AsyncStorage.getItem(ATTRIBUTION_ID_KEY);
    } catch {
        cachedAttributionId = null;
    }
    setRequestAttributionId(cachedAttributionId);
    return cachedAttributionId;
}

export async function saveAttributionId(attributionId?: string | null): Promise<void> {
    if (!attributionId) return;
    cachedAttributionId = attributionId;
    setRequestAttributionId(attributionId);
    try {
        await AsyncStorage.setItem(ATTRIBUTION_ID_KEY, attributionId);
    } catch {
        /* 저장 실패해도 메모리 캐시로 이번 세션은 동작한다 */
    }
}

/**
 * Android Play Install Referrer.
 *
 * 스토어 링크에 붙인 `&referrer=...` 값을 설치 후 첫 실행에서 그대로 돌려준다.
 * 안드로이드 신규 설치의 유입원을 무료로 100% 확정할 수 있는 유일한 경로다.
 * (애플은 같은 기능을 제공하지 않아 iOS 는 서버에서 IP·시각으로 추정 매칭한다)
 *
 * 네이티브 모듈이 없는 빌드(웹/구버전 dev client)에서도 앱이 죽지 않도록 전부 감싼다.
 */
async function readInstallReferrer(): Promise<string | null> {
    if (Platform.OS !== 'android') return null;

    try {
        const { PlayInstallReferrer } = require('react-native-play-install-referrer');
        if (!PlayInstallReferrer?.getInstallReferrerInfo) return null;

        return await new Promise<string | null>(resolve => {
            // 스토어 서비스 응답이 없을 때 앱 시작이 막히지 않도록 3초에서 끊는다.
            const timer = setTimeout(() => resolve(null), 3000);
            PlayInstallReferrer.getInstallReferrerInfo((info: any, error: unknown) => {
                clearTimeout(timer);
                resolve(error ? null : (info?.installReferrer ?? null));
            });
        });
    } catch {
        return null;
    }
}

/** 딥링크 URL 에서 방문자 식별자를 꺼낸다(웹에서 앱으로 넘어올 때 붙여 보낸 값). */
function readAidFromUrl(url: string | null): string | null {
    if (!url) return null;
    try {
        const { queryParams } = Linking.parse(url);
        const value = queryParams?.lb_aid;
        return typeof value === 'string' ? value : null;
    } catch {
        return null;
    }
}

/**
 * 앱 최초 실행 시 1회 — 유입 매칭.
 *
 * 이미 매칭했으면 저장된 식별자만 메모리에 올리고 끝낸다.
 * 실패해도 앱 동작에는 영향이 없어야 하므로 예외는 전부 삼킨다(통계 부가 기능).
 */
export async function initAttribution(): Promise<void> {
    if (Platform.OS === 'web') return; // Expo 웹은 웹 프론트의 쿠키를 그대로 쓴다

    try {
        await loadAttributionId();
        if (await AsyncStorage.getItem(APP_OPEN_DONE_KEY)) return;

        const initialUrl = await Linking.getInitialURL();
        const [deviceId, installReferrer] = await Promise.all([
            getOrCreateDeviceId(),
            readInstallReferrer(),
        ]);

        const res = await apiClient.post<{ success: boolean; attributionId?: string; matchType?: string }>(
            '/internal/app-open',
            {
                deviceId,
                platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
                installReferrer,
                deepLinkAid: readAidFromUrl(initialUrl),
                deepLinkUrl: initialUrl,
            },
        );

        await saveAttributionId(res.data?.attributionId);
        await AsyncStorage.setItem(APP_OPEN_DONE_KEY, '1');
    } catch {
        /* 매칭 실패는 다음 실행에서 다시 시도한다(플래그를 세우지 않았으므로) */
    }
}

/**
 * 앱이 이미 설치된 상태에서 딥링크로 열렸을 때.
 * 웹에서 넘겨준 식별자가 있으면 그걸로 갈아탄다 — 그쪽이 광고 유입 이력을 들고 있는 쪽이다.
 */
export async function handleDeepLink(url: string | null): Promise<void> {
    const aid = readAidFromUrl(url);
    if (!aid || aid === cachedAttributionId) return;
    await saveAttributionId(aid);
}
