import { useMemo } from 'react';
import {
    View, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePointBalance, usePointHistory, usePointPolicies, useCanChargePoint } from '@/services/point/queries';
import type { PointHistoryItem, PointPolicy } from '@/services/point/types';

const won = (n: number) => n.toLocaleString('ko-KR');

/** 'YYYY-MM-DD HH:mm:ss' → 'MM.DD HH:mm'. 서버가 KST 문자열로 주므로 Date 로 바꾸지 않는다. */
function shortTime(kst: string): string {
    const [d, t] = (kst ?? '').split(' ');
    if (!d) return '';
    const [, mm, dd] = d.split('-');
    return `${mm}.${dd}${t ? ` ${t.slice(0, 5)}` : ''}`;
}

/** 적립처 한 줄의 부연 — 하루 몇 번인지, 평생 한 번인지. */
function limitText(p: PointPolicy): string | null {
    if (p.lifetimeCountLimit === 1) return '최초 1회';
    if (p.lifetimeCountLimit) return `평생 ${p.lifetimeCountLimit}회`;
    if (p.dailyCountLimit) return `하루 ${p.dailyCountLimit}회`;
    return null;
}

/**
 * 내 포인트.
 *
 * 앱은 그동안 포인트를 **받기만 하고 볼 데가 없었다** — 앱 설치 1,000P 가 들어가도
 * 사용자는 모른다. 잔액과 내역을 여기서 본다.
 *
 * 충전은 안드로이드만 연다. iOS 는 디지털 재화를 애플 인앱결제로만 팔 수 있어
 * PayApp 을 태우면 심사에서 막힌다(App Store 3.1.1). 인앱결제가 붙기 전까지는
 * iOS 에 충전 버튼을 아예 그리지 않는다 — 눌러서 안 되는 것보다 없는 게 낫다.
 */
export default function PointPage() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const { data: balance, isLoading } = usePointBalance();
    const { data: policies } = usePointPolicies();
    const {
        data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading: histLoading,
    } = usePointHistory();

    const items = useMemo(
        () => (data?.pages ?? []).flatMap((p) => p.items),
        [data],
    );
    const earns = (policies ?? []).filter((p) => p.kind === 'earn' && p.amount > 0);
    const canCharge = useCanChargePoint();

    if (isLoading) {
        return (
            <View style={s.container}>
                <Nav onBack={() => router.back()} />
                <ActivityIndicator size="small" color="#60a5fa" style={{ marginTop: 40 }} />
            </View>
        );
    }

    // 기능이 꺼져 있으면 잔액도 내역도 의미가 없다.
    if (!balance?.enabled) {
        return (
            <View style={s.container}>
                <Nav onBack={() => router.back()} />
                <View style={s.emptyWrap}>
                    <Ionicons name="wallet-outline" size={44} color="#cbd5e1" />
                    <Text style={s.emptyText}>포인트는 아직 준비 중입니다.</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={s.container}>
            <Nav onBack={() => router.back()} />

            <FlatList
                data={items}
                keyExtractor={(it) => String(it.id)}
                renderItem={({ item }) => <HistoryRow item={item} />}
                contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
                showsVerticalScrollIndicator={false}
                onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
                onEndReachedThreshold={0.5}
                ListHeaderComponent={
                    <>
                        {/* 잔액 */}
                        <View style={s.card}>
                            <Text style={s.cardLabel}>보유 포인트</Text>
                            <Text style={s.cardAmount}>{won(balance.balance)}P</Text>
                            <Text style={s.cardSub}>
                                충전 {won(balance.paidBalance)}P · 적립 {won(balance.freeBalance)}P
                            </Text>

                            {canCharge && (
                                <TouchableOpacity
                                    style={s.chargeBtn}
                                    onPress={() => router.push('/mypage/point-charge' as never)}
                                    activeOpacity={0.85}
                                >
                                    <Ionicons name="add-circle-outline" size={18} color="#0f172a" />
                                    <Text style={s.chargeText}>포인트 충전</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* 쌓는 법 — 충전이 막힌 iOS 에서는 이게 유일한 안내다 */}
                        {earns.length > 0 && (
                            <View style={s.earnCard}>
                                <View style={s.earnHead}>
                                    <Ionicons name="sparkles" size={15} color="#b45309" />
                                    <Text style={s.earnTitle}>포인트를 쌓아보세요!</Text>
                                </View>
                                {earns.map((p) => {
                                    const limit = limitText(p);
                                    return (
                                        <View key={p.code} style={s.earnRow}>
                                            <Text style={s.earnLabel}>
                                                {p.label}
                                                {limit ? <Text style={s.earnLimit}>{`  (${limit})`}</Text> : null}
                                            </Text>
                                            <Text style={s.earnAmount}>+{won(p.amount)}P</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        )}

                        <Text style={s.sectionTitle}>사용 내역</Text>

                        {histLoading && (
                            <ActivityIndicator size="small" color="#60a5fa" style={{ paddingVertical: 20 }} />
                        )}
                    </>
                }
                ListEmptyComponent={
                    histLoading ? null : (
                        <Text style={s.emptyHistory}>아직 내역이 없습니다.</Text>
                    )
                }
                ListFooterComponent={
                    isFetchingNextPage
                        ? <ActivityIndicator size="small" color="#60a5fa" style={{ paddingVertical: 16 }} />
                        : null
                }
            />
        </View>
    );
}

function Nav({ onBack }: { onBack: () => void }) {
    return (
        <View style={s.nav}>
            <TouchableOpacity onPress={onBack} style={s.navBack}>
                <Ionicons name="chevron-back" size={24} color="#0f172a" />
            </TouchableOpacity>
            <Text style={s.navTitle}>내 포인트</Text>
            <View style={s.navBack} />
        </View>
    );
}

/** 원장 한 줄. 받은 것은 초록, 쓴 것은 검정 — 색으로 방향이 읽혀야 한다. */
function HistoryRow({ item }: { item: PointHistoryItem }) {
    const plus = item.amount > 0;
    return (
        <View style={s.histRow}>
            <View style={{ flex: 1 }}>
                <Text style={s.histLabel}>{item.label}</Text>
                <Text style={s.histMeta}>
                    {shortTime(item.createdAt)}
                    {item.memo ? ` · ${item.memo}` : ''}
                </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
                <Text style={[s.histAmount, plus ? s.histPlus : s.histMinus]}>
                    {plus ? '+' : '−'}{won(Math.abs(item.amount))}P
                </Text>
                <Text style={s.histAfter}>{won(item.balanceAfter)}P</Text>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f1f5f9' },
    nav: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#fff', paddingTop: 10, paddingBottom: 12, paddingHorizontal: 16,
        borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
    },
    navBack: { width: 40, alignItems: 'flex-start' },
    navTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },

    card: {
        backgroundColor: '#0f172a', margin: 12, marginBottom: 8,
        borderRadius: 16, paddingHorizontal: 20, paddingVertical: 20,
    },
    cardLabel: { fontSize: 12, color: '#94a3b8' },
    cardAmount: { fontSize: 28, fontWeight: '800', color: '#fff', marginTop: 4 },
    cardSub: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
    chargeBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        backgroundColor: '#fff', borderRadius: 12, paddingVertical: 11, marginTop: 16,
    },
    chargeText: { fontSize: 14, fontWeight: '700', color: '#0f172a' },

    earnCard: {
        backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a',
        marginHorizontal: 12, borderRadius: 16, padding: 14,
    },
    earnHead: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
    earnTitle: { fontSize: 13, fontWeight: '700', color: '#78350f' },
    earnRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 3 },
    earnLabel: { fontSize: 13, color: '#78350f', flex: 1 },
    earnLimit: { fontSize: 11, color: '#b45309' },
    earnAmount: { fontSize: 13, fontWeight: '700', color: '#b45309' },

    sectionTitle: {
        fontSize: 13, fontWeight: '700', color: '#475569',
        marginTop: 20, marginBottom: 6, marginHorizontal: 16,
    },
    histRow: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
        marginHorizontal: 12, marginBottom: 6, borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 12,
    },
    histLabel: { fontSize: 14, color: '#1e293b', fontWeight: '600' },
    histMeta: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
    histAmount: { fontSize: 14, fontWeight: '700' },
    histPlus: { color: '#059669' },
    histMinus: { color: '#334155' },
    histAfter: { fontSize: 11, color: '#cbd5e1', marginTop: 2 },

    emptyWrap: { alignItems: 'center', marginTop: 80, gap: 10 },
    emptyText: { fontSize: 14, color: '#94a3b8' },
    emptyHistory: { textAlign: 'center', color: '#94a3b8', fontSize: 13, marginTop: 30 },
});
