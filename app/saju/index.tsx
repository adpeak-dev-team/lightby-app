import { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorNotice } from '@/components/saju/ErrorNotice';
import { GateNotice, useSajuGate } from '@/components/saju/SajuGate';
import { SajuForm } from '@/components/saju/SajuForm';
import { usePointBalance } from '@/services/point/queries';
import { useSajuAccess, useSaveSajuProfile } from '@/services/saju/queries';
import type { SajuProfile, SajuProfileInput } from '@/services/saju/types';

const won = (n: number) => n.toLocaleString('ko-KR');
const pad = (n: number) => String(n).padStart(2, '0');

/** 서버 프로필 → 폼 입력값 */
const toInput = (p: SajuProfile): SajuProfileInput => ({
    calendarType: p.calendarType,
    isLeapMonth: p.isLeapMonth,
    birthTime: p.birthTime ? `${pad(p.birthTime.hour)}:${pad(p.birthTime.minute)}` : null,
    timeUnknown: p.timeUnknown,
    birthRegion: p.birthRegion,
});

const sameInput = (a: SajuProfileInput, b: SajuProfileInput) =>
    a.calendarType === b.calendarType &&
    a.isLeapMonth === b.isLeapMonth &&
    a.birthTime === b.birthTime &&
    a.timeUnknown === b.timeUnknown &&
    a.birthRegion === b.birthRegion;

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
    const save = useSaveSajuProfile();

    // 폼 초안은 서버 프로필에서 **파생**시킨다. 사용자가 손대기 전에는 별도 상태를 두지 않아,
    // 프로필이 늦게 도착해도 동기화용 useEffect 가 필요 없다(그 방식은 렌더를 한 번 더 유발한다).
    const [edited, setEdited] = useState<SajuProfileInput | null>(null);

    const profile = gate.kind === 'ok' ? gate.profile : null;
    const saved = profile ? toInput(profile) : null;
    const draft = edited ?? saved;
    // 저장하지 않은 변경 — 이걸 안 짚어 주면 음력으로 바꿔 놓고 그대로 메뉴로 들어가
    // 양력 기준 운세를 보게 된다.
    const dirty = !!(draft && saved && !sameInput(draft, saved));

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

                    {/* 내 정보 — 사주는 이 값으로 뽑는다. 틀린 채로 보는 일이 없게 위에 둔다. */}
                    {profile && (
                        <View style={s.myInfo}>
                            <View style={{ flex: 1 }}>
                                <Text style={s.myName}>
                                    {profile.name || '이름 없음'}
                                    <Text style={s.myGender}>
                                        {'  '}{profile.gender === 'female' ? '여' : '남'}
                                    </Text>
                                </Text>
                                <Text style={s.myBirth}>
                                    {profile.birthday
                                        ? `${profile.birthday.year}. ${pad(profile.birthday.month)}. ${pad(profile.birthday.day)}`
                                        : '생년월일 없음'}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={s.myEdit}
                                onPress={() => router.push('/mypage/talent' as never)}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="create-outline" size={13} color="#475569" />
                                <Text style={s.myEditText}>내 정보 변경</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* 사주 설정 — 접지 않고 펼쳐 둔다.
                        톱니바퀴 뒤에 숨기면 여는 사람이 거의 없어, 양력/음력이 틀린 채로
                        운세를 보게 된다. 저장하지 않아도 양력 · 시각 모름 · 서울로 계산된다. */}
                    {draft && (
                        <View style={s.settingCard}>
                            <Text style={s.settingTitle}>사주 설정</Text>
                            <SajuForm
                                value={draft}
                                onChange={setEdited}
                                onSubmit={() => save.mutate(draft, { onSuccess: () => setEdited(null) })}
                                submitting={save.isPending}
                                submitLabel={dirty ? '변경한 정보 저장' : '이 정보로 저장'}
                            />
                            {save.isError ? (
                                <ErrorNotice error={save.error} />
                            ) : !dirty && save.isSuccess ? (
                                <Text style={s.saved}>저장했습니다</Text>
                            ) : !profile?.hasProfile ? (
                                <Text style={s.settingNote}>
                                    저장하지 않아도 양력 · 시각 모름 · 서울 기준으로 볼 수 있습니다.
                                    {'\n'}저장하면 시주까지 반영돼 더 정확해집니다.
                                </Text>
                            ) : null}
                        </View>
                    )}

                    {dirty && (
                        <View style={s.dirty}>
                            <Ionicons name="alert-circle" size={14} color="#b45309" />
                            <Text style={s.dirtyText}>
                                저장하지 않은 변경이 있습니다. 저장해야 아래 운세에 반영됩니다.
                            </Text>
                        </View>
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

    myInfo: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 12,
        backgroundColor: '#fff', borderRadius: 16,
        paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8,
    },
    myName: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
    myGender: { fontSize: 13, fontWeight: '500', color: '#94a3b8' },
    myBirth: { fontSize: 14, fontWeight: '600', color: '#475569', marginTop: 2 },
    myEdit: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
        borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8,
    },
    myEditText: { fontSize: 11, fontWeight: '700', color: '#475569' },

    settingCard: {
        backgroundColor: '#fff', borderRadius: 16,
        paddingHorizontal: 16, paddingVertical: 16, marginBottom: 8,
    },
    settingTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginBottom: 14 },
    settingNote: { fontSize: 11, color: '#94a3b8', marginTop: 12, lineHeight: 17, textAlign: 'center' },
    saved: { fontSize: 12, fontWeight: '700', color: '#059669', marginTop: 12, textAlign: 'center' },

    dirty: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 6,
        backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a',
        borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8,
    },
    dirtyText: { flex: 1, fontSize: 11, fontWeight: '600', color: '#b45309', lineHeight: 16 },

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
