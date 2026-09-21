import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import EventSource from 'react-native-sse';

import { BASE_URL, tokenStorage } from '@/api/apiClient';
import { NOTIFICATION_KEYS } from './queries';

const RECONNECT_DELAY_MS = 5_000;

/**
 * 알림 미읽음 개수 실시간 반영(SSE).
 *
 * 서버는 개수가 아니라 "변했다"는 신호만 보낸다 → 받으면 unread-count를 재조회한다.
 * RN에는 EventSource가 없어 react-native-sse(순수 JS, Expo Go에서도 동작)를 쓴다.
 *
 * 설계 메모
 * - 포그라운드일 때만 연결한다. 백그라운드에서 소켓을 붙들고 있으면 배터리만 먹고,
 *   어차피 복귀 시 focusManager가 재조회를 걸어준다.
 * - 자동 재연결 대신 직접 재연결한다. react-native-sse는 생성 시점의 헤더를 계속 재사용해서,
 *   토큰이 갱신되면 만료된 Bearer로 영원히 재시도하게 된다. 매번 토큰을 새로 읽는다.
 * - 폴링(useGetUnreadCount의 refetchInterval)은 SSE가 막히는 환경을 위한 안전망으로 남겨둔다.
 *
 * ⚠️ 연결은 **앱 전체에 하나**다(2026-09-21). 헤더가 탭 5개에 하나씩 있어서, 예전엔 탭을 다
 * 열어 본 사용자에게 SSE 가 5개 붙었다. 안드로이드 네트워크(OkHttp)는 **한 호스트에 동시 요청
 * 5개**가 한도라, 스트림이 그 자리를 다 차지하면 나머지 API 요청(명함 저장·삭제 등)이 전부
 * 줄을 서서 "저장 중…" 에서 멈췄다. 스트림이 끊기는 순간(앱 전환 등) 밀린 요청이 한꺼번에
 * 나가는 게 서버 로그에 그대로 남아 있었다. 그래서 구독자 수를 세어 첫 구독자가 열고
 * 마지막 구독자가 닫는다.
 */
let subscribers = 0;
let teardown: (() => void) | null = null;

export function useNotificationStream(enabled: boolean) {
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!enabled) return;
        subscribers += 1;
        if (subscribers === 1) teardown = openStream(queryClient);
        return () => {
            subscribers -= 1;
            if (subscribers === 0 && teardown) {
                teardown();
                teardown = null;
            }
        };
    }, [enabled, queryClient]);
}

/** 연결 하나를 열고, 닫는 함수를 돌려준다. */
function openStream(queryClient: ReturnType<typeof useQueryClient>): () => void {
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const close = () => {
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
        if (es) {
            es.removeAllEventListeners();
            es.close();
            es = null;
        }
    };

    const scheduleReconnect = () => {
        if (cancelled || reconnectTimer) return;
        reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            connect();
        }, RECONNECT_DELAY_MS);
    };

    const connect = async () => {
        if (cancelled || AppState.currentState !== 'active') return;

        const token = await tokenStorage.get();
        if (!token || cancelled) return;

        close();
        es = new EventSource(`${BASE_URL}/api/notifications/stream`, {
            headers: { Authorization: `Bearer ${token}` },
            // 내장 재연결은 끄고(만료 토큰 재사용 문제) 위의 scheduleReconnect로 처리한다
            pollingInterval: 0,
        });

        es.addEventListener('message', (event) => {
            let type: string | undefined;
            try {
                type = JSON.parse(event.data ?? '{}')?.type;
            } catch {
                return;
            }
            if (type === 'ping') return; // 커넥션 유지용
            queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
        });

        es.addEventListener('error', scheduleReconnect);
    };

    const onAppStateChange = (status: AppStateStatus) => {
        if (status === 'active') connect();
        else close();
    };

    connect();
    const sub = AppState.addEventListener('change', onAppStateChange);

    return () => {
        cancelled = true;
        sub.remove();
        close();
    };
}
