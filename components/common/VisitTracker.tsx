import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePathname } from 'expo-router';
import { apiClient } from '@/api/apiClient';

// 웹 프론트(VisitTracker.tsx)와 동일한 하루 1회 기록 규칙. 저장 키도 의미를 맞춰 둔다.
const LAST_VISIT_KEY = 'lastVisitDate';

// 서버(today_count)가 한국 시간 기준으로 날짜를 끊으므로 여기서도 KST 날짜로 맞춘다.
// KST는 서머타임이 없어 UTC+9 고정 오프셋으로 계산해도 정확하고, Intl 지원 여부를 타지 않는다.
const kstToday = () => new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);

/**
 * 앱 방문 기록 — 하루 한 번 POST /internal/visit 을 호출해 관리자 방문자 통계에 앱 접속을 반영한다.
 *
 * 서버는 x-visit-platform 헤더로만 웹/앱을 구분한다. User-Agent 로는 안드로이드 기기의
 * 모바일 웹과 안드로이드 앱을 구분할 수 없어서, 이 헤더를 안 보내면 전부 웹으로 집계된다.
 *
 * 앱은 며칠씩 떠 있을 수 있으므로 마운트 시 한 번만이 아니라 포그라운드 복귀 때도 날짜를 다시 확인한다.
 * (Expo 웹에서는 웹 프론트와 중복 집계되므로 아예 기록하지 않는다)
 */
export default function VisitTracker() {
    const pathname = usePathname();
    // 기록 시점의 화면 경로만 쓰고 경로 변경으로 재실행되면 안 되므로 ref 로 최신값을 들고 있는다.
    const pathnameRef = useRef(pathname);
    pathnameRef.current = pathname;

    useEffect(() => {
        if (Platform.OS === 'web') return;

        const recordDailyVisit = async () => {
            try {
                const today = kstToday();
                if ((await AsyncStorage.getItem(LAST_VISIT_KEY)) === today) return;

                await apiClient.post('/internal/visit', null, {
                    headers: {
                        'x-visit-path': pathnameRef.current,
                        'x-visit-platform': Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
                    },
                });

                // 서버 기록에 성공했을 때만 저장 — 실패하면 다음 기회에 다시 시도한다.
                await AsyncStorage.setItem(LAST_VISIT_KEY, today);
            } catch {
                /* 통계는 부가 기능이라 실패해도 조용히 넘어간다 */
            }
        };

        recordDailyVisit();

        // 자정을 넘겨 다시 켠 경우를 위해 포그라운드 복귀 때마다 날짜를 재확인한다.
        const onChange = (status: AppStateStatus) => {
            if (status === 'active') recordDailyVisit();
        };
        const sub = AppState.addEventListener('change', onChange);
        return () => sub.remove();
    }, []);

    return null;
}
