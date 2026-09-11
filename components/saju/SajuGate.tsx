import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from '@/components/common/AppText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AxiosError } from 'axios';

import { ErrorNotice } from '@/components/saju/ErrorNotice';
import { useSajuProfile } from '@/services/saju/queries';
import type { SajuProfile } from '@/services/saju/types';

/**
 * 사주 화면들의 공통 진입 조건.
 *
 * 로그인했는가 → 생년월일이 있는가 → 사주 프로필(역법·시각)을 넣었는가.
 * 화면마다 복붙하면 조건이 하나 바뀔 때 한쪽만 고쳐져 반드시 어긋나므로 한 곳에 둔다.
 * (웹의 FortuneGate 와 같은 판단을 RN 으로 옮긴 것)
 */
export type SajuGate =
    | { kind: 'loading' }
    | { kind: 'needLogin' }
    | { kind: 'needBirthday' }
    | { kind: 'error'; error: unknown }
    | { kind: 'ok'; profile: SajuProfile };

export function useSajuGate(): SajuGate {
    const { data: profile, isLoading, error } = useSajuProfile();

    if (isLoading) return { kind: 'loading' };
    // 로그인해야 내 생년월일을 읽을 수 있다
    if (error instanceof AxiosError && error.response?.status === 401) {
        return { kind: 'needLogin' };
    }
    // ⚠️ 401 이 아닌 실패까지 "로그인이 필요합니다" 로 뭉뚱그리면, 서버가 500 을
    //    내는 동안 사용자는 멀쩡한 계정으로 로그인 화면만 반복해 보게 된다.
    if (error) return { kind: 'error', error };
    if (!profile) return { kind: 'needLogin' };
    // 생년월일이 회원 정보에 없으면 사주 자체를 뽑을 수 없다.
    // 여기서 받지 않는 이유: 두 곳에 같은 값을 두면 반드시 어긋난다.
    if (!profile.hasBirthday) return { kind: 'needBirthday' };
    return { kind: 'ok', profile };
}

/** 통과하지 못한 게이트를 화면으로. `ok` 는 각 화면이 알아서 그린다. */
export function GateNotice({ gate }: { gate: Exclude<SajuGate, { kind: 'ok' }> }) {
    const router = useRouter();

    if (gate.kind === 'loading') {
        return <ActivityIndicator size="small" color="#60a5fa" style={{ marginTop: 60 }} />;
    }

    if (gate.kind === 'error') {
        return <ErrorNotice error={gate.error} />;
    }

    if (gate.kind === 'needLogin') {
        return (
            <View style={s.wrap}>
                <Ionicons name="lock-closed-outline" size={44} color="#cbd5e1" />
                <Text style={s.title}>로그인이 필요합니다</Text>
                <Text style={s.desc}>사주는 내 생년월일로 뽑기 때문에{'\n'}로그인 후 이용할 수 있어요.</Text>
                <TouchableOpacity style={s.btn} onPress={() => router.push('/auth/login')} activeOpacity={0.85}>
                    <Text style={s.btnText}>로그인하기</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={s.wrap}>
            <Ionicons name="calendar-outline" size={44} color="#cbd5e1" />
            <Text style={s.title}>생년월일이 필요합니다</Text>
            <Text style={s.desc}>
                회원 정보에 생년월일을 넣어 주세요.{'\n'}
                사주는 그 값으로 계산합니다.
            </Text>
            <TouchableOpacity
                style={s.btn}
                onPress={() => router.push('/set-user-info/profile' as never)}
                activeOpacity={0.85}
            >
                <Text style={s.btnText}>회원 정보 입력하기</Text>
            </TouchableOpacity>
        </View>
    );
}

const s = StyleSheet.create({
    wrap: { alignItems: 'center', marginTop: 70, paddingHorizontal: 32, gap: 10 },
    title: { fontSize: 16, fontWeight: '700', color: '#334155' },
    desc: { fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },
    btn: {
        marginTop: 10, backgroundColor: '#2563eb',
        borderRadius: 12, paddingHorizontal: 22, paddingVertical: 12,
    },
    btnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
