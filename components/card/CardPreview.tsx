import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

import type { CardPayload } from '@/services/card/types';

/** 웹 오리진. 미리보기 렌더러가 거기 있다. */
const WEB_ORIGIN = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://lightby.co.kr';
const PREVIEW_URL = `${WEB_ORIGIN}/card/preview`;

/**
 * 명함 미리보기.
 *
 * 템플릿을 RN 으로 다시 그리지 않고 **웹 렌더러를 그대로 띄운다.**
 *
 * 명함은 받는 사람이 여는 /card/{token} 이 진실인데 그건 웹이 그린다. 앱이 따로
 * 그리면 보내는 사람이 본 미리보기와 받는 사람이 본 화면이 달라지고, 템플릿을
 * 하나 고칠 때마다 두 곳을 고쳐야 한다 — 한쪽만 고쳐지는 건 시간 문제다.
 *
 * 카드 값은 postMessage 로 보낸다. URL 에 실으면 이름·전화번호가 서버 로그에 남는다.
 */
export function CardPreview({ card }: { card: Partial<CardPayload> }) {
    const ref = useRef<WebView>(null);
    const [ready, setReady] = useState(false);
    const [height, setHeight] = useState(500);

    // 페이지가 준비됐다고 알려 오면 그때부터 값을 보낸다.
    // 그전에 보낸 것은 리스너가 없어 그냥 사라진다.
    useEffect(() => {
        if (!ready) return;
        ref.current?.postMessage(JSON.stringify({ type: 'CARD_PREVIEW', card }));
    }, [ready, card]);

    return (
        <View style={[s.wrap, { height }]}>
            {!ready && (
                <View style={s.loading}>
                    <ActivityIndicator size="small" color="#94a3b8" />
                </View>
            )}
            <WebView
                ref={ref}
                source={{ uri: PREVIEW_URL }}
                style={{ backgroundColor: 'transparent' }}
                scrollEnabled={false}
                // 미리보기라 사용자가 눌러 다른 데로 갈 일이 없다.
                onShouldStartLoadWithRequest={(r) => r.url.startsWith(PREVIEW_URL)}
                onMessage={(e) => {
                    try {
                        const m = JSON.parse(e.nativeEvent.data);
                        if (m?.type === 'PREVIEW_READY') setReady(true);
                        // 그린 높이에 WebView 를 맞춘다. 안 맞추면 잘리거나 빈 공간이 남는다.
                        if (m?.type === 'PREVIEW_HEIGHT' && m.height > 0) {
                            setHeight(Math.min(Math.max(Number(m.height) + 8, 300), 900));
                        }
                    } catch {
                        // 우리 메시지가 아니다
                    }
                }}
            />
        </View>
    );
}

const s = StyleSheet.create({
    wrap: { width: '100%', backgroundColor: 'transparent' },
    loading: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center', justifyContent: 'center', zIndex: 1,
    },
});
