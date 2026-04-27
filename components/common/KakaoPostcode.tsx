import { useState } from 'react';
import {
    View, Text, TouchableOpacity, Modal,
    ActivityIndicator, StyleSheet,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const REST_KEY = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY ?? '';

// Android/iOS 모두 안정적인 ReactNativeWebView.postMessage 방식
const POSTCODE_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #wrap { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="wrap"></div>
  <script src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"></script>
  <script>
    function rnLog(msg) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'LOG', message: msg }));
    }
    rnLog('스크립트 시작, ReactNativeWebView 존재: ' + !!window.ReactNativeWebView);
    rnLog('daum 존재: ' + !!window.daum);
    new daum.Postcode({
      oncomplete: function(data) {
        var addr = data.roadAddress || data.jibunAddress || data.address;
        rnLog('oncomplete 실행됨, 주소: ' + addr);
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'POSTCODE_SELECTED',
          address: addr
        }));
      }
    }).embed(document.getElementById('wrap'));
    rnLog('embed 완료');
  </script>
</body>
</html>`;

async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
    try {
        const res = await fetch(
            `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`,
            { headers: { Authorization: `KakaoAK ${REST_KEY}` } },
        );
        const json = await res.json();
        console.log('[geocode] 응답:', JSON.stringify(json));
        const doc = json.documents?.[0];
        if (!doc) {
            console.warn('[geocode] documents 없음 - 키 등록 or 주소 문제');
            return null;
        }
        return { lat: parseFloat(doc.y), lng: parseFloat(doc.x) };
    } catch (e) {
        console.error('[KakaoPostcode] geocode error', e);
        return null;
    }
}

interface Props {
    address: string;
    onSelect: (address: string, lat: number, lng: number) => void;
}

export function KakaoPostcode({ address, onSelect }: Props) {
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleMessage = (event: any) => {
        console.log('[KakaoPostcode] onMessage raw:', event.nativeEvent.data);
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'LOG') {
                console.log('[WebView]', data.message);
                return;
            }
            if (data.type !== 'POSTCODE_SELECTED' || !data.address) return;
            console.log('[KakaoPostcode] 주소 선택됨:', data.address);

            const addr: string = data.address;
            setVisible(false);
            setLoading(true);

            geocode(addr)
                .then((coords) => {
                    // geocoding 실패해도 주소는 반드시 반영
                    onSelect(addr, coords?.lat ?? 0, coords?.lng ?? 0);
                })
                .catch(() => {
                    onSelect(addr, 0, 0);
                })
                .finally(() => {
                    setLoading(false);
                });
        } catch (e) {
            console.error('[KakaoPostcode] onMessage parse error', e);
        }
    };

    return (
        <>
            <TouchableOpacity
                style={s.btn}
                onPress={() => setVisible(true)}
                activeOpacity={0.8}
            >
                <Ionicons name="search-outline" size={16} color="#3b82f6" />
                <Text style={[s.btnText, !!address && s.btnTextFilled]} numberOfLines={1}>
                    {address || '주소 검색'}
                </Text>
                {loading && <ActivityIndicator size="small" color="#3b82f6" style={{ marginLeft: 4 }} />}
            </TouchableOpacity>

            <Modal
                visible={visible}
                animationType="slide"
                statusBarTranslucent
                onRequestClose={() => setVisible(false)}
            >
                <SafeAreaView style={s.modal}>
                    <View style={s.header}>
                        <Text style={s.headerTitle}>주소 검색</Text>
                        <TouchableOpacity onPress={() => setVisible(false)} hitSlop={8}>
                            <Ionicons name="close" size={24} color="#111827" />
                        </TouchableOpacity>
                    </View>
                    <WebView
                        source={{
                            html: POSTCODE_HTML,
                            baseUrl: 'https://localhost'
                        }}
                        onMessage={handleMessage}
                        javaScriptEnabled
                        domStorageEnabled
                        originWhitelist={['*']}
                        style={{ flex: 1 }}
                    />
                </SafeAreaView>
            </Modal>
        </>
    );
}

const s = StyleSheet.create({
    btn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1.5,
        borderColor: '#3b82f6',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        backgroundColor: '#eff6ff',
    },
    btnText: {
        flex: 1,
        fontSize: 14,
        color: '#93c5fd',
    },
    btnTextFilled: {
        color: '#1d4ed8',
        fontWeight: '500',
    },
    modal: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
    },
});
