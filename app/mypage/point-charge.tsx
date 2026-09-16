import { useEffect, useState } from 'react';
import {
    View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { POINT_QUERY_KEYS, usePointBalance, usePointPackages } from '@/services/point/queries';
import type { PointPackage } from '@/services/point/types';
import { prepareStorePointOrder } from '@/services/iap/api';
import { IapError, loadStorePrices, purchaseStore, recoverUnfinished } from '@/lib/iap';

const won = (n: number) => n.toLocaleString('ko-KR');

/**
 * 포인트 충전.
 *
 * 앱은 **스토어 인앱결제만** 쓴다 (iOS App Store / Android Google Play).
 * 앱 안에서 파는 포인트는 디지털 상품이라 두 스토어 모두 자기 결제를 요구한다.
 * 가격은 스토어가 주는 표시가를 그대로 보여준다 — 우리 DB 가격을 쓰면 실제 청구액과 어긋날 수 있다.
 * 흐름은 lib/iap.ts. 웹 충전은 PayApp 으로 따로 돈다.
 */
export default function PointChargePage() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const qc = useQueryClient();

    const { data: balance } = usePointBalance();
    const { data: packages, isLoading } = usePointPackages();

    const [busy, setBusy] = useState<string | null>(null);
    /** 상품 ID → '₩1,100'. 스토어에서 못 불러온 상품은 팔지 않는다 */
    const [storePrices, setStorePrices] = useState<Record<string, string> | null>(null);

    const refresh = () => {
        qc.invalidateQueries({ queryKey: POINT_QUERY_KEYS.balance });
        qc.invalidateQueries({ queryKey: POINT_QUERY_KEYS.history });
    };

    useEffect(() => {
        if (!packages?.enabled) return;
        const ids = packages.items.map((p) => p.storeProductId).filter((v): v is string => !!v);
        loadStorePrices(ids).then(setStorePrices).catch(() => setStorePrices({}));
        // 전에 결제만 되고 반영이 안 된 건이 있으면 여기서 마무리한다
        recoverUnfinished().then((r) => { if (r.length) refresh(); });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [packages]);

    const start = async (pkg: PointPackage) => {
        if (busy) return;
        setBusy(pkg.code);
        try {
            await charge(pkg);
        } catch (e: any) {
            if (e instanceof IapError) {
                if (e.kind !== 'cancelled') Alert.alert(e.kind === 'pending' ? '승인 대기' : '충전 실패', e.message);
            } else {
                Alert.alert('충전 실패', e?.response?.data?.message ?? '결제를 시작하지 못했습니다.');
            }
        } finally {
            setBusy(null);
        }
    };

    const charge = async (pkg: PointPackage) => {
        const order = await prepareStorePointOrder(pkg.code);
        const result = await purchaseStore(order);
        refresh();
        if (result.kind === 'point') {
            Alert.alert('충전 완료', `${won(result.points)}P가 지급되었습니다.`, [
                { text: '확인', onPress: () => router.back() },
            ]);
        }
    };

    // 스토어 가격을 불러온 상품만 보여준다 — 아직 등록 전이거나 심사 중이면 팔 수 없다
    const items = (packages?.items ?? []).filter((p) => p.storeProductId && storePrices?.[p.storeProductId]);
    const priceText = (p: PointPackage) => storePrices?.[p.storeProductId ?? ''] ?? '';
    const loading = isLoading || (!!packages?.enabled && storePrices === null);

    return (
        <View style={s.container}>
            <View style={s.nav}>
                <TouchableOpacity onPress={() => router.back()} style={s.navBack}>
                    <Ionicons name="chevron-back" size={24} color="#0f172a" />
                </TouchableOpacity>
                <Text style={s.navTitle}>포인트 충전</Text>
                <View style={s.navBack} />
            </View>

            <ScrollView
                contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 32 }}
                showsVerticalScrollIndicator={false}
            >
                <View style={s.card}>
                    <Text style={s.cardLabel}>보유 포인트</Text>
                    <Text style={s.cardAmount}>{won(balance?.balance ?? 0)}P</Text>
                </View>

                {loading ? (
                    <ActivityIndicator size="small" color="#60a5fa" style={{ marginTop: 30 }} />
                ) : !packages?.enabled || items.length === 0 ? (
                    <View style={s.iosWrap}>
                        <Ionicons name="wallet-outline" size={44} color="#cbd5e1" />
                        <Text style={s.iosDesc}>충전은 아직 준비 중입니다.</Text>
                    </View>
                ) : (
                    <>
                        {items.map((p) => (
                            <TouchableOpacity
                                key={p.code}
                                style={[s.pkg, busy !== null && s.pkgDisabled]}
                                onPress={() => start(p)}
                                disabled={busy !== null}
                                activeOpacity={0.85}
                            >
                                <View style={s.pkgLeft}>
                                    <Text style={s.pkgPoints}>{won(p.points)}P</Text>
                                    {p.bonusPoints > 0 && (
                                        <View style={s.bonus}>
                                            <Text style={s.bonusText}>+{won(p.bonusPoints)}P</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={s.pkgPrice}>
                                    {busy === p.code ? '결제 중…' : priceText(p)}
                                </Text>
                            </TouchableOpacity>
                        ))}

                        <Text style={s.note}>
                            결제는 스토어 계정으로 청구되며, 결제가 끝나면 바로 반영됩니다.
                        </Text>
                    </>
                )}
            </ScrollView>

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
        backgroundColor: '#0f172a', borderRadius: 16,
        paddingHorizontal: 20, paddingVertical: 18, marginBottom: 12,
    },
    cardLabel: { fontSize: 12, color: '#94a3b8' },
    cardAmount: { fontSize: 26, fontWeight: '800', color: '#fff', marginTop: 4 },

    pkg: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0',
        paddingHorizontal: 18, paddingVertical: 16, marginBottom: 8,
    },
    pkgDisabled: { opacity: 0.5 },
    pkgLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    pkgPoints: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
    bonus: { backgroundColor: '#ecfdf5', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
    bonusText: { fontSize: 11, fontWeight: '700', color: '#059669' },
    pkgPrice: { fontSize: 14, fontWeight: '600', color: '#475569' },

    note: { fontSize: 11, color: '#94a3b8', marginTop: 8, marginHorizontal: 4, lineHeight: 17 },

    iosWrap: { alignItems: 'center', marginTop: 70, gap: 10, paddingHorizontal: 32 },
    iosDesc: { fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },
});
