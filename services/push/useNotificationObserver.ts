import { useEffect } from 'react';
import { InteractionManager } from 'react-native';
import { useRouter, useRootNavigationState } from 'expo-router';
import * as Notifications from 'expo-notifications';

import { queryClient } from '@/lib/queryClient';
import { NOTIFICATION_KEYS } from '@/services/notifications/queries';

// 알림 payload(data)를 보고 화면 이동.
// 라우팅 스펙은 [notifications.tsx handlePress]와 일치해야 한다 (동일한 알림을 인박스에서 눌러도, 푸시에서 눌러도 같은 곳으로).
function routeFromData(
    router: ReturnType<typeof useRouter>,
    data: Record<string, any> | undefined,
) {
    if (!data) return;
    const siteId = data.siteId;
    const boardId = data.boardId;

    try {
    switch (data.type) {
        // 커뮤니티
        case 'community_comment':      // 내 글에 새 댓글 → 해당 게시글
            if (boardId != null) {
                router.push({ pathname: '/posts/board/[id]', params: { id: String(boardId) } });
            }
            return;

        // 지원 관련
        case 'apply_complete':         // 지원 완료 → 내 지원현황
            router.push('/mypage/application-status' as never);
            return;
        case 'new_applicant':          // 신규 지원자 → 지원자관리
        case 'applicants_pending':     // 미확인 지원자 누적 → 지원자관리
            router.push('/mypage/applicant-management' as never);
            return;
        case 'profile_viewed':         // 프로필 열람됨 → 내 지원현황
            router.push('/mypage/application-status' as never);
            return;
        case 'site_liked_milestone':   // 관심 공고 증가 → 해당 공고
            if (siteId != null) {
                router.push({ pathname: '/posts/site/[id]', params: { id: String(siteId) } });
            }
            return;

        // 예약 발송 (인박스 표시)
        case 'matched_digest':         // 맞춤 공고 → 관심현장
        case 'deadline_liker':
        case 'deadline_liker_group':   // 찜 공고 마감 임박 → 관심현장
            router.push('/(tabs)/favorite' as never);
            return;
        case 'deadline_owner':
        case 'deadline_owner_group':   // 마감 임박 → 해당 공고 (담당자로 받은 경우 내 글 관리엔 없다)
            {
                const id = siteId ?? data.sampleSiteId;
                if (id != null) {
                    router.push({ pathname: '/posts/site/[id]', params: { id: String(id) } });
                } else {
                    router.push('/mypage/post' as never);
                }
            }
            return;
        case 'profile_incomplete':     // 프로필 미완성 → 프로필 편집
            router.push('/mypage/talent' as never);
            return;

        // inactive / install_promo / 앱이 모르는 신규 타입 등은 홈으로.
        // (인박스 [notifications.tsx handlePress]의 default와 일치시킨다)
        default:
            router.push('/' as never);
            return;
    }
    } catch {
        // 라우팅 중 어떤 이유로든 실패해도 앱이 빈 화면에 갇히지 않도록 홈으로 폴백.
        try { router.push('/' as never); } catch { /* noop */ }
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
    // navState.key 만 보고 바로 push 하면, anchor((tabs))의 첫 화면이 아직
    // 페인트되기 전이라 "빈 스택 위로 push → 검은 화면"이 될 수 있다(안드로이드에서 특히).
    // 첫 프레임/인터랙션이 끝난 뒤로 이동을 미뤄 탭 화면이 확실히 마운트된 상태에서 push 한다.
    useEffect(() => {
        if (!navReady) return;
        let mounted = true;
        const task = InteractionManager.runAfterInteractions(() => {
            if (!mounted) return;
            Notifications.getLastNotificationResponseAsync().then((response) => {
                if (!mounted || !response) return;
                routeFromData(router, response.notification.request.content.data);
            });
        });
        return () => {
            mounted = false;
            task.cancel();
        };
    }, [navReady]);

    // 런타임: 앱이 백그라운드/포그라운드에 떠 있을 때 알림 탭.
    useEffect(() => {
        const sub = Notifications.addNotificationResponseReceivedListener((response) => {
            routeFromData(router, response.notification.request.content.data);
        });
        return () => sub.remove();
    }, []);

    // 포그라운드에서 푸시가 "도착"한 순간 배지/인박스를 갱신한다.
    // (탭하지 않아도 헤더 종 아이콘의 숫자가 바로 올라가야 한다)
    useEffect(() => {
        const sub = Notifications.addNotificationReceivedListener(() => {
            queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.unreadCount });
            queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
        });
        return () => sub.remove();
    }, []);
}
