import { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

/**
 * 유입 딥링크 착지점 — https://lightby.co.kr/open?lb_aid=...
 *
 * 앱이 설치된 사용자를 웹에서 앱으로 넘길 때 쓰는 경로다.
 * URL 에 실린 방문자 식별자는 루트 레이아웃의 딥링크 핸들러(lib/attribution.ts)가 이미 저장하므로
 * 여기서는 화면만 홈으로 넘긴다. 이 라우트가 없으면 expo-router 가 '없는 경로' 화면을 띄운다.
 */
export default function OpenRedirect() {
    useEffect(() => {
        router.replace('/');
    }, []);

    return <View />;
}
