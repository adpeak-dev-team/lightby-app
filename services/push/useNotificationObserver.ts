import { useEffect } from 'react';
import { useRouter, useRootNavigationState } from 'expo-router';
import * as Notifications from 'expo-notifications';

// 알림 payload(data)를 보고 화면 이동.
// 현재 공고 관련 알림(등록완료/지원완료/신규지원자)은 모두 해당 공고 상세로 이동한다.
function routeFromData(
    router: ReturnType<typeof useRouter>,
    data: Record<string, any> | undefined,
) {
    if (!data) return;
    const siteId = data.siteId;

    switch (data.type) {
        case 'jobpost_created': // 공고 등록 완료 → 등록한 공고
        case 'job_applied':     // 지원 완료 → 지원한 공고
        case 'new_applicant':   // 신규 지원자 → 해당 공고
        case 'profile_viewed':  // 프로필 열람됨 → 해당 공고
        case 'site_liked_milestone': // 관심 공고 증가 → 해당 공고
            if (siteId != null) {
                router.push({ pathname: '/posts/site/[id]', params: { id: String(siteId) } });
            }
            break;
        case 'applicants_pending': // 미확인 지원자 누적 → 해당 공고의 지원자 목록
            if (siteId != null) {
                router.push({ pathname: '/posts/applicants/[id]', params: { id: String(siteId) } });
            }
            break;
        default:
            break;
    }
}

/**
 * 푸시 알림 탭 → 해당 화면으로 이동시키는 옵저버.
 * RootLayout에서 한 번 호출한다.
 */
export function useNotificationObserver() {
    const router = useRouter();
    const navState = useRootNavigationState();
    const navReady = !!navState?.key;

    // 콜드 스타트: 앱이 종료된 상태에서 알림을 탭해 실행된 경우.
    // 네비게이터가 준비된 뒤 1회 처리한다.
    useEffect(() => {
        if (!navReady) return;
        let mounted = true;
        Notifications.getLastNotificationResponseAsync().then((response) => {
            if (!mounted || !response) return;
            routeFromData(router, response.notification.request.content.data);
        });
        return () => {
            mounted = false;
        };
    }, [navReady]);

    // 런타임: 앱이 백그라운드/포그라운드에 떠 있을 때 알림 탭.
    useEffect(() => {
        const sub = Notifications.addNotificationResponseReceivedListener((response) => {
            routeFromData(router, response.notification.request.content.data);
        });
        return () => sub.remove();
    }, []);
}
