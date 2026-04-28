import { useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    ScrollView, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { login, getProfile, logout } from '@react-native-seoul/kakao-login';

export default function KakaoTestPage() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<string>('');
    const [resultType, setResultType] = useState<'success' | 'error' | null>(null);

    const showResult = (data: any, type: 'success' | 'error') => {
        const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        setResult(text);
        setResultType(type);
        console.log(`[KakaoTest] ${type}:`, data);
    };

    const handleLogin = async () => {
        setLoading(true);
        try {
            const token = await login();
            showResult(token, 'success');
        } catch (e: any) {
            const msg = e?.message ?? JSON.stringify(e, Object.getOwnPropertyNames(e));
            showResult(msg, 'error');
            console.log('[KakaoTest] 로그인 에러 전체:', JSON.stringify(e, Object.getOwnPropertyNames(e)));
        } finally {
            setLoading(false);
        }
    };

    const handleGetProfile = async () => {
        setLoading(true);
        try {
            const profile = await getProfile();
            showResult(profile, 'success');
        } catch (e: any) {
            showResult(e?.message ?? String(e), 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        setLoading(true);
        try {
            const msg = await logout();
            showResult('로그아웃 완료: ' + msg, 'success');
        } catch (e: any) {
            showResult(e?.message ?? String(e), 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[s.container, { paddingTop: insets.top }]}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                    <Ionicons name="chevron-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={s.headerTitle}>카카오 로그인 테스트</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={s.content}>
                <TouchableOpacity
                    style={s.kakaoBtn}
                    onPress={handleLogin}
                    disabled={loading}
                    activeOpacity={0.85}
                >
                    {loading
                        ? <ActivityIndicator color="#3c1e1e" />
                        : <Text style={s.kakaoText}>🔑 카카오 로그인</Text>}
                </TouchableOpacity>

                <TouchableOpacity
                    style={s.profileBtn}
                    onPress={handleGetProfile}
                    disabled={loading}
                    activeOpacity={0.85}
                >
                    <Text style={s.profileText}>👤 프로필 가져오기</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={s.logoutBtn}
                    onPress={handleLogout}
                    disabled={loading}
                    activeOpacity={0.85}
                >
                    <Text style={s.logoutText}>🚪 로그아웃</Text>
                </TouchableOpacity>

                {result ? (
                    <View style={[s.resultBox, resultType === 'error' ? s.resultBoxError : s.resultBoxSuccess]}>
                        <Text style={s.resultLabel}>
                            {resultType === 'error' ? '❌ 에러' : '✅ 성공'}
                        </Text>
                        <Text style={s.resultText}>{result}</Text>
                    </View>
                ) : (
                    <View style={s.guide}>
                        <Text style={s.guideText}>
                            1. 카카오 로그인 버튼을 누르면{'\n'}
                            accessToken이 결과창에 표시돼요.{'\n\n'}
                            2. 로그인 후 프로필 가져오기로{'\n'}
                            사용자 정보를 확인할 수 있어요.{'\n\n'}
                            3. 콘솔에도 전체 데이터가 찍혀요.
                        </Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    backBtn: { width: 40 },
    headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
    content: { padding: 24, gap: 12 },
    kakaoBtn: {
        backgroundColor: '#FEE500',
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        shadowColor: '#FEE500',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 4,
    },
    kakaoText: { fontSize: 16, fontWeight: '800', color: '#3c1e1e' },
    profileBtn: {
        backgroundColor: '#fff',
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#e5e7eb',
    },
    profileText: { fontSize: 15, fontWeight: '700', color: '#374151' },
    logoutBtn: {
        backgroundColor: '#fff',
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#fca5a5',
    },
    logoutText: { fontSize: 15, fontWeight: '700', color: '#ef4444' },
    resultBox: {
        borderRadius: 14,
        padding: 16,
        marginTop: 8,
    },
    resultBoxSuccess: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac' },
    resultBoxError: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5' },
    resultLabel: { fontSize: 13, fontWeight: '700', marginBottom: 8, color: '#374151' },
    resultText: { fontSize: 12, color: '#374151', lineHeight: 20, fontFamily: 'monospace' },
    guide: {
        backgroundColor: '#eff6ff',
        borderRadius: 14,
        padding: 20,
        marginTop: 8,
    },
    guideText: { fontSize: 14, color: '#3b82f6', lineHeight: 24 },
});
