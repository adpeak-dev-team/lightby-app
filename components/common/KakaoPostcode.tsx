import { useState, useEffect } from 'react';
import {
  View, TouchableOpacity, Modal, Pressable, ActivityIndicator, StyleSheet, TextInput, Keyboard,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { WebView } from 'react-native-webview';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const REST_KEY = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY ?? '';

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
    new daum.Postcode({
      oncomplete: function(data) {
        var addr = data.roadAddress || data.jibunAddress || data.address;
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'POSTCODE_SELECTED',
          address: addr
        }));
      }
    }).embed(document.getElementById('wrap'));
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
        const doc = json.documents?.[0];
        if (!doc) return null;
        return { lat: parseFloat(doc.y), lng: parseFloat(doc.x) };
    } catch {
        return null;
    }
}

interface Props {
    address: string;
    onSelect: (address: string, lat: number, lng: number) => void;
}

export function KakaoPostcode({ address, onSelect }: Props) {
    const insets = useSafeAreaInsets();
    const [postcodeVisible, setPostcodeVisible] = useState(false);
    const [errorVisible, setErrorVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [inputText, setInputText] = useState(address);

    useEffect(() => {
        setInputText(address);
    }, [address]);

    const showApplyButton = inputText.trim() !== '' && inputText !== address;

    const handleMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type !== 'POSTCODE_SELECTED' || !data.address) return;

            const addr: string = data.address;
            setPostcodeVisible(false);
            setInputText(addr);
            setLoading(true);

            geocode(addr)
                .then((coords) => { onSelect(addr, coords?.lat ?? 0, coords?.lng ?? 0); })
                .catch(() => { onSelect(addr, 0, 0); })
                .finally(() => setLoading(false));
        } catch { /* ignore */ }
    };

    const handleApply = async () => {
        const trimmed = inputText.trim();
        if (!trimmed) return;
        Keyboard.dismiss();
        setLoading(true);
        try {
            const coords = await geocode(trimmed);
            if (!coords) {
                setErrorVisible(true);
                return;
            }
            onSelect(trimmed, coords.lat, coords.lng);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <View style={s.row}>
                <TextInput
                    style={s.input}
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder="주소를 검색해주세요"
                    placeholderTextColor="#94a3b8"
                    returnKeyType="done"
                    onSubmitEditing={handleApply}
                />


                {loading && (
                    <ActivityIndicator size="small" color="#3b82f6" style={s.spinner} />
                )}

                {showApplyButton && !loading && (
                    <TouchableOpacity style={[s.iconBtn, s.btnApply]} onPress={handleApply} activeOpacity={0.8}>
                        <Ionicons name="map-outline" size={15} color="#fff" />
                    </TouchableOpacity>
                )}

                <TouchableOpacity style={s.iconBtn} onPress={() => setPostcodeVisible(true)} activeOpacity={0.8}>
                    <Ionicons name="search-outline" size={15} color="#fff" />
                </TouchableOpacity>
            </View>

            <Text style={s.hint}>
                <Ionicons name="search-outline" /> 버튼으로 주소 검색 또는, 주소 직접 입력 후 <Ionicons name="map-outline" /> 버튼으로 지도 적용
            </Text>

            {/* 카카오 우편번호 모달 */}
            <Modal
                visible={postcodeVisible}
                animationType="slide"
                statusBarTranslucent
                onRequestClose={() => setPostcodeVisible(false)}
            >
                <SafeAreaView style={s.postcodeModal}>
                    <View style={s.postcodeHeader}>
                        <TouchableOpacity onPress={() => setPostcodeVisible(false)} hitSlop={8}>
                            <Ionicons name="chevron-back" size={22} color="#0f172a" />
                        </TouchableOpacity>
                        <Text style={s.postcodeTitle}>주소 검색</Text>
                        <TouchableOpacity onPress={() => setPostcodeVisible(false)} hitSlop={8}>
                            <Ionicons name="close" size={24} color="#0f172a" />
                        </TouchableOpacity>
                    </View>
                    <WebView
                        source={{ html: POSTCODE_HTML, baseUrl: 'https://localhost' }}
                        onMessage={handleMessage}
                        javaScriptEnabled
                        domStorageEnabled
                        originWhitelist={['*']}
                        style={{ flex: 1 }}
                    />
                </SafeAreaView>
            </Modal>

            {/* 주소 검색 실패 모달 */}
            <Modal
                visible={errorVisible}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={() => setErrorVisible(false)}
            >
                <Pressable style={s.overlay} onPress={() => setErrorVisible(false)} />
                <View style={[s.errorSheet, { paddingBottom: insets.bottom + 28 }]}>
                    <View style={s.errorIconWrap}>
                        <Ionicons name="location-outline" size={32} color="#ef4444" />
                    </View>
                    <Text style={s.errorTitle}>주소를 찾을 수 없습니다</Text>
                    <Text style={s.errorDesc}>
                        입력하신 주소로 위치를 확인하지 못했습니다.{'\n'}
                        주소를 다시 확인하거나 주소 검색을 이용해 주세요.
                    </Text>
                    <TouchableOpacity
                        style={s.errorBtn}
                        onPress={() => setErrorVisible(false)}
                        activeOpacity={0.8}
                    >
                        <Text style={s.errorBtnText}>확인</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        </>
    );
}

const s = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    input: {
        flex: 1,
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 11,
        fontSize: 14,
        color: '#0f172a',
        backgroundColor: '#f8fafc',
    },
    spinner: {
        marginHorizontal: 4,
    },
    iconBtn: {
        backgroundColor: '#334155',
        borderRadius: 10,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnApply: {
        backgroundColor: '#3b82f6',
    },

    // 우편번호 모달
    postcodeModal: {
        flex: 1,
        backgroundColor: '#fff',
    },
    postcodeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    postcodeTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0f172a',
    },

    // 에러 모달
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    errorSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 28,
        paddingHorizontal: 24,
        alignItems: 'center',
        gap: 8,
    },
    errorIconWrap: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#fef2f2',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    errorTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#0f172a',
    },
    errorDesc: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 21,
        marginBottom: 8,
    },
    errorBtn: {
        width: '100%',
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: '#0f172a',
        alignItems: 'center',
        marginTop: 4,
    },
    errorBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
    },
    hint: {
        marginTop: 0,
        fontSize: 11,
        color: '#94a3b8',
        lineHeight: 16,
    },
});
