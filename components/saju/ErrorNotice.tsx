import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '@/components/common/AppText';
import { Ionicons } from '@expo/vector-icons';
import { AxiosError } from 'axios';

/**
 * 서버가 내려준 message 를 그대로 보여준다.
 *
 * 사주 API 의 실패는 대부분 "로그인이 필요하다" / "생년월일이 없다" 처럼
 * 사용자가 바로 조치할 수 있는 것들이라, 뭉뚱그린 문구보다 원문이 훨씬 낫다.
 * (웹의 errorMessage 와 같은 판단)
 */
export function errorMessage(err: unknown, fallback = '잠시 후 다시 시도해 주세요.'): string {
    if (err instanceof AxiosError) {
        const data = err.response?.data as { message?: string } | undefined;
        if (data?.message) return data.message;
        if (err.response?.status === 401) return '로그인이 필요한 서비스입니다.';
        if (err.response?.status) return `서버 오류 (${err.response.status})`;
        // 응답 자체가 없다 — 서버에 닿지 못한 것이다(주소·네트워크)
        return `서버에 연결하지 못했습니다. (${err.message})`;
    }
    return fallback;
}

/**
 * 조회 실패 안내.
 *
 * ⚠️ 이게 없으면 화면이 **영원히 로딩 스피너**로 남는다. 사주 조회는 retry:false 라
 *    실패하면 isLoading 이 false 로 떨어지는데 data 는 계속 없기 때문이다.
 *    "안 불러와진다" 는 신고는 거의 이 상태다 — 무엇이 잘못됐는지 화면에 남겨야 한다.
 */
export function ErrorNotice({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
    return (
        <View style={s.wrap}>
            <Ionicons name="cloud-offline-outline" size={40} color="#cbd5e1" />
            <Text style={s.title}>운세를 불러오지 못했습니다</Text>
            <Text style={s.desc}>{errorMessage(error)}</Text>
            {onRetry && (
                <TouchableOpacity style={s.btn} onPress={onRetry} activeOpacity={0.85}>
                    <Text style={s.btnText}>다시 시도</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const s = StyleSheet.create({
    wrap: { alignItems: 'center', marginTop: 60, paddingHorizontal: 32, gap: 8 },
    title: { fontSize: 15, fontWeight: '700', color: '#334155' },
    desc: { fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },
    btn: {
        marginTop: 10, backgroundColor: '#2563eb',
        borderRadius: 12, paddingHorizontal: 22, paddingVertical: 11,
    },
    btnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
