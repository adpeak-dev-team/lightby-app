import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GateNotice, useSajuGate } from '@/components/saju/SajuGate';
import { usePointBalance } from '@/services/point/queries';
import { useSajuAccess } from '@/services/saju/queries';

const won = (n: number) => n.toLocaleString('ko-KR');

/**
 * 사주 허브.
 *
 * 넷을 **같은 높이**에 놓는다. 예전 웹이 오늘 운세 화면 맨 아래에 나머지를 달았는데,
 * 그러면 이번달 운세를 보려는 사람도 오늘 운세를 끝까지 스크롤해야 닿았다.
 *
 * 오늘의 사주만 눈에 띄게 둔다 — 매일 들어올 이유를 만드는 화면이고,
 * 나머지 셋은 그날그날 찾는 화면이 아니다.
 */
const MENU = [
    {
        code: 'saju_today',
        title: '오늘의 사주',
        desc: '일진으로 보는 오늘의 계약운 · 상담운 · 인간관계운',
        icon: 'sunny' as const,
        route: '/saju/today',
        primary: true,
    },
    {
        code: 'saju_monthly',
        title: '이번달 운세',
        desc: '이번 달 흐름과 계약운이 좋은 시기까지',
        icon: 'calendar' as const,
        route: '/saju/monthly',
        primary: false,
    },
    {
        code: 'saju_life',
        title: '평생 총운',
        desc: '사주팔자 · 오행 · 십신 · 신살 · 대운 전체',
        icon: 'infinite' as const,
        route: '/saju/natal',
        primary: false,
    },
    {
        code: 'saju_match',
        title: '영업 궁합',
        desc: '팀장 · 팀원 · 파트너와의 업무 궁합 점수',
        icon: 'people' as const,
        route: '/saju/match',
        primary: false,
    },
];

export default function SajuHome() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const gate = useSajuGate();
    const { data: balance } = usePointBalance();
    const { data: access } = useSajuAccess();

    return (
        <View style={s.container}>
            <View style={s.nav}>
                <TouchableOpacity onPress={() => router.back()} style={s.navBack}>
                    <Ionicons name="chevron-back" size={24} color="#0f172a" />
                </TouchableOpacity>
                <Text style={s.navTitle}>사주</Text>
                <View style={s.navBack} />
            </View>

            {gate.kind !== 'ok' ? (
                <GateNotice gate={gate} />
            ) : (
                <ScrollView
                    contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 32 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* 잔액 — 유료 항목이 섞여 있으니 얼마 있는지가 여기 있어야 한다 */}
                    {balance?.enabled && (
                        <TouchableOpacity
                            style={s.balanceRow}
                            onPress={() => router.push('/mypage/point' as never)}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="wallet-outline" size={17} color="#d97706" />
                            <Text style={s.balanceLabel}>내 포인트</Text>
                            <Text style={s.balanceAmount}>{won(balance.balance)}P</Text>
                            <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
                        </TouchableOpacity>
                    )}

                    {MENU.map((m) => {
                        const a = access?.find((x) => x.code === m.code);
                        // 이미 산 것은 값이 아니라 '보유중'을 보여 준다.
                        const badge = !a || a.cost <= 0
                            ? null
                            : a.owned ? '보유중' : `${won(a.cost)}P`;

                        return (
                            <TouchableOpacity
                                key={m.code}
                                style={[s.item, m.primary && s.itemPrimary]}
                                onPress={() => router.push(m.route as never)}
                                activeOpacity={0.85}
                            >
                                <View style={[s.itemIcon, m.primary && s.itemIconPrimary]}>
                                    <Ionicons
                                        name={m.icon}
                                        size={20}
                                        color={m.primary ? '#fff' : '#64748b'}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <View style={s.itemHead}>
                                        <Text style={[s.itemTitle, m.primary && s.itemTitlePrimary]}>
                                            {m.title}
                                        </Text>
                                        {badge && (
                                            <View style={[s.badge, a?.owned && s.badgeOwned]}>
                                                <Text style={[s.badgeText, a?.owned && s.badgeTextOwned]}>
                                                    {badge}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={s.itemDesc}>{m.desc}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                            </TouchableOpacity>
                        );
                    })}

                    <Text style={s.note}>
                        사주는 회원 정보의 생년월일로 계산합니다.
                        {'\n'}태어난 시각을 몰라도 볼 수 있어요.
                    </Text>
                </ScrollView>
            )}
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

    balanceRow: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a',
        borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 10,
    },
    balanceLabel: { fontSize: 13, color: '#78350f', flex: 1 },
    balanceAmount: { fontSize: 14, fontWeight: '800', color: '#b45309' },

    item: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: '#fff', borderRadius: 16,
        paddingHorizontal: 16, paddingVertical: 16, marginBottom: 8,
    },
    itemPrimary: { backgroundColor: '#1e293b' },
    itemIcon: {
        width: 40, height: 40, borderRadius: 12, backgroundColor: '#f1f5f9',
        alignItems: 'center', justifyContent: 'center',
    },
    itemIconPrimary: { backgroundColor: '#334155' },
    itemHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    itemTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
    itemTitlePrimary: { color: '#fff' },
    itemDesc: { fontSize: 12, color: '#94a3b8', marginTop: 2, lineHeight: 17 },

    badge: { backgroundColor: '#eff6ff', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
    badgeOwned: { backgroundColor: '#ecfdf5' },
    badgeText: { fontSize: 10, fontWeight: '700', color: '#2563eb' },
    badgeTextOwned: { color: '#059669' },

    note: { fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 16, lineHeight: 17 },
});
