import { useState, type ReactNode } from 'react';
import {
    View, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { usePointBalance, usePointPolicies, useCanChargePoint } from '@/services/point/queries';
import { useSajuAccess } from '@/services/saju/queries';
import type { SajuAccess } from '@/services/saju/types';

const won = (n: number) => n.toLocaleString('ko-KR');

/**
 * 유료 사주 항목의 결제 확인.
 *
 * **화면에 들어온 것만으로 차감되면 안 된다.** 이번달 운세·평생 총운은 결과를
 * 저장하지 않아서, 이용권이 없으면 부를 때마다 과금된다. 여기서 확인을 받은 뒤에야
 * 조회를 켠다. 실제 차감은 서버가 조회 시점에 한 번만 하고, 그 기간 안에는 무료다.
 *
 * iOS 는 충전이 막혀 있어(App Store 3.1.1) 부족할 때 보낼 곳이 없다.
 * 그래서 안드로이드와 다른 말을 한다 — 충전 대신 적립으로 모으라고 안내한다.
 */
export function PointGate({
    code,
    children,
}: {
    code: SajuAccess['code'];
    /** 확인을 받은(또는 이미 이용권이 있는) 뒤에만 그린다. */
    children: (ready: boolean) => ReactNode;
}) {
    const router = useRouter();
    const { data: access, isLoading } = useSajuAccess();
    const { data: balance } = usePointBalance();
    const { data: policies } = usePointPolicies();
    const [confirmed, setConfirmed] = useState(false);
    // ⚠️ 훅은 전부 아래 early return 보다 **위에서** 부른다. 예전엔 이 줄이 return 뒤에 있어서,
    // 로딩(return) → 결제 확인 화면 순서로 그려질 때 훅 개수가 달라져 React 가 화면을
    // 통째로 멈췄다("운세 들어가면 무한 로딩 + 먹통", 이용권이 없는 항목에서만 간헐적으로).
    const canCharge = useCanChargePoint();

    const item = access?.find((a) => a.code === code);

    // 상태를 모르는 동안에는 조회를 켜지 않는다 — 켜면 확인 없이 차감된다.
    if (isLoading || !item) {
        return <ActivityIndicator size="small" color="#60a5fa" style={{ marginTop: 60 }} />;
    }

    // 이미 이용권이 있거나 무료로 열어둔 항목이면 그냥 보여 준다.
    if (item.owned || confirmed) return <>{children(true)}</>;

    const balanceNow = balance?.balance ?? 0;
    const short = balanceNow < item.cost;
    const earns = (policies ?? []).filter((p) => p.kind === 'earn' && p.amount > 0);

    return (
        <View style={s.wrap}>
            <View style={s.card}>
                <Ionicons name="sparkles" size={34} color="#f59e0b" />
                <Text style={s.label}>{item.label}</Text>
                <Text style={s.cost}>{won(item.cost)}P</Text>
                <Text style={s.period}>
                    {item.periodKey === 'lifetime'
                        ? '한 번 결제하면 계속 볼 수 있습니다.'
                        : '이번 달 안에는 다시 봐도 추가 차감이 없습니다.'}
                </Text>
                <Text style={s.balance}>보유 {won(balanceNow)}P</Text>

                {short ? (
                    <>
                        <View style={s.shortBox}>
                            <Text style={s.shortText}>
                                포인트가 {won(item.cost - balanceNow)}P 부족합니다.
                            </Text>
                        </View>

                        {/* 충전만 권하면 돈 쓸 생각이 없는 사람은 그냥 나간다.
                            iOS 는 충전 자체가 막혀 있어 이게 유일한 길이기도 하다. */}
                        {earns.length > 0 && (
                            <View style={s.earnBox}>
                                <Text style={s.earnTitle}>포인트를 쌓아보세요!</Text>
                                {earns.map((p) => (
                                    <View key={p.code} style={s.earnRow}>
                                        <Text style={s.earnLabel}>{p.label}</Text>
                                        <Text style={s.earnAmount}>+{won(p.amount)}P</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {canCharge && (
                            <TouchableOpacity
                                style={s.primaryBtn}
                                onPress={() => router.push('/mypage/point-charge' as never)}
                                activeOpacity={0.85}
                            >
                                <Text style={s.primaryText}>포인트 충전하기</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={s.ghostBtn}
                            onPress={() => router.push('/mypage/point' as never)}
                            activeOpacity={0.8}
                        >
                            <Text style={s.ghostText}>내 포인트 보기</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <TouchableOpacity
                        style={s.primaryBtn}
                        onPress={() => setConfirmed(true)}
                        activeOpacity={0.85}
                    >
                        <Text style={s.primaryText}>{won(item.cost)}P 사용하고 보기</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    wrap: { padding: 16 },
    card: {
        backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0',
        padding: 24, alignItems: 'center',
    },
    label: { fontSize: 15, fontWeight: '700', color: '#334155', marginTop: 10 },
    cost: { fontSize: 30, fontWeight: '800', color: '#0f172a', marginTop: 2 },
    period: { fontSize: 13, color: '#64748b', marginTop: 10, textAlign: 'center', lineHeight: 19 },
    balance: { fontSize: 13, color: '#94a3b8', marginTop: 14 },

    shortBox: {
        backgroundColor: '#fef2f2', borderRadius: 10,
        paddingHorizontal: 12, paddingVertical: 8, marginTop: 14, alignSelf: 'stretch',
    },
    shortText: { fontSize: 13, color: '#dc2626', textAlign: 'center' },

    earnBox: {
        backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a',
        borderRadius: 12, padding: 12, marginTop: 12, alignSelf: 'stretch',
    },
    earnTitle: { fontSize: 13, fontWeight: '700', color: '#78350f', marginBottom: 6 },
    earnRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
    earnLabel: { fontSize: 13, color: '#78350f' },
    earnAmount: { fontSize: 13, fontWeight: '700', color: '#b45309' },

    primaryBtn: {
        backgroundColor: '#2563eb', borderRadius: 12,
        paddingVertical: 13, marginTop: 16, alignSelf: 'stretch', alignItems: 'center',
    },
    primaryText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    ghostBtn: { paddingVertical: 10, marginTop: 4 },
    ghostText: { fontSize: 12, color: '#94a3b8' },
});
