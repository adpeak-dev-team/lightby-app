import { useState } from 'react';
import {
    View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ShareSheet } from '@/components/card/ShareSheet';
import { useCards, useDeleteCard } from '@/services/card/queries';
import { usePointBalance, usePointPolicies } from '@/services/point/queries';
import type { CardListItem } from '@/services/card/types';

const won = (n: number) => n.toLocaleString('ko-KR');

/**
 * 내 명함.
 *
 * 현장이 바뀌면 **새 명함을 만든다.** 기존 것을 고치면 예전에 뿌린 링크까지 새
 * 현장으로 바뀌어 받은 사람이 오해한다. 그래서 한 사람이 여러 장을 갖는다.
 *
 * 제작에 포인트가 든다(첫 장은 무료). 값은 만들기 전에 보여 준다 — 다 만들고
 * 저장할 때 "부족합니다" 가 뜨면 들인 수고가 통째로 날아간다.
 */
export default function CardListPage() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const { data: cards, isLoading } = useCards();
    const { data: balance } = usePointBalance();
    const { data: policies } = usePointPolicies();
    const { mutate: remove, isPending: removing } = useDeleteCard();

    const [sharing, setSharing] = useState<CardListItem | null>(null);

    const policy = balance?.enabled
        ? policies?.find((x) => x.code === 'card_create')
        : undefined;
    // 남은 무료 횟수는 **서버가 준 값**을 쓴다. 명함 수로 세면 지웠다 다시 만들 때
    // 화면은 무료라고 하고 서버는 차감한다(서버는 원장으로 센다).
    const freeLeft = policy?.freeLeft ?? 0;
    const createCost = policy && freeLeft === 0 ? policy.amount : 0;
    const short = createCost > 0 && (balance?.balance ?? 0) < createCost;

    const onCreate = () => {
        if (short) {
            Alert.alert(
                '포인트가 부족합니다',
                `명함 제작에 ${won(createCost)}P가 필요합니다.\n지금 ${won(balance?.balance ?? 0)}P 있어요.`,
                [
                    { text: '닫기', style: 'cancel' },
                    { text: '내 포인트', onPress: () => router.push('/mypage/point' as never) },
                ],
            );
            return;
        }
        router.push('/mypage/card/edit' as never);
    };

    const onDelete = (c: CardListItem) => {
        Alert.alert(
            '이 명함을 삭제할까요?',
            '이미 보낸 링크는 "삭제된 명함입니다" 안내가 뜹니다.',
            [
                { text: '취소', style: 'cancel' },
                { text: '삭제', style: 'destructive', onPress: () => remove(c.id) },
            ],
        );
    };

    return (
        <View style={s.container}>
            <View style={s.nav}>
                <TouchableOpacity onPress={() => router.back()} style={s.navBack}>
                    <Ionicons name="chevron-back" size={24} color="#0f172a" />
                </TouchableOpacity>
                <Text style={s.navTitle}>내 명함</Text>
                <View style={s.navBack} />
            </View>

            <ScrollView
                contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 32 }}
                showsVerticalScrollIndicator={false}
            >
                {isLoading ? (
                    <ActivityIndicator size="small" color="#60a5fa" style={{ marginTop: 40 }} />
                ) : !cards?.length ? (
                    <View style={s.empty}>
                        <Ionicons name="id-card-outline" size={44} color="#cbd5e1" />
                        <Text style={s.emptyTitle}>아직 명함이 없습니다</Text>
                        <Text style={s.emptyDesc}>
                            현장이 바뀔 때마다 새 명함을 만들어 두면,{'\n'}
                            예전에 보낸 링크는 그대로 유지됩니다.
                        </Text>
                    </View>
                ) : (
                    cards.map((c) => (
                        <View key={c.id} style={s.card}>
                            <View style={{ flex: 1 }}>
                                <Text style={s.cardTitle}>{c.title || c.siteName || c.name}</Text>
                                <Text style={s.cardMeta}>
                                    {[c.position, c.company].filter(Boolean).join(' · ') || '—'}
                                </Text>
                                <Text style={s.cardStat}>
                                    발송 {c.stats.sent}건 · 열람 {c.stats.viewed}건
                                </Text>
                            </View>
                            <View style={s.cardBtns}>
                                <TouchableOpacity
                                    style={s.sendBtn}
                                    onPress={() => setSharing(c)}
                                    activeOpacity={0.85}
                                >
                                    <Ionicons name="paper-plane" size={14} color="#fff" />
                                    <Text style={s.sendText}>보내기</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={s.iconBtn}
                                    onPress={() => router.push({
                                        pathname: '/mypage/card/edit',
                                        params: { id: String(c.id) },
                                    } as never)}
                                >
                                    <Ionicons name="create-outline" size={16} color="#64748b" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={s.iconBtn}
                                    onPress={() => onDelete(c)}
                                    disabled={removing}
                                >
                                    <Ionicons name="trash-outline" size={16} color="#94a3b8" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}

                <TouchableOpacity
                    style={[s.createBtn, short && s.createBtnOff]}
                    onPress={onCreate}
                    activeOpacity={0.85}
                >
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text style={s.createText}>
                        새 명함 만들기{createCost > 0 && !short ? ` (${won(createCost)}P)` : ''}
                    </Text>
                </TouchableOpacity>

                {/* 값은 누르기 전에 보여 준다 */}
                {short ? (
                    <Text style={s.noteWarn}>
                        포인트가 {won(createCost - (balance?.balance ?? 0))}P 부족합니다 · 보유 {won(balance?.balance ?? 0)}P
                    </Text>
                ) : freeLeft > 0 ? (
                    <Text style={s.note}>
                        {freeLeft === 1 ? '첫 장은 무료입니다' : `${freeLeft}장까지 무료입니다`}
                    </Text>
                ) : createCost > 0 ? (
                    <Text style={s.note}>
                        제작에 {won(createCost)}P · 보유 {won(balance?.balance ?? 0)}P · 만든 뒤 수정은 무료
                    </Text>
                ) : null}
            </ScrollView>

            <ShareSheet card={sharing} onClose={() => setSharing(null)} />
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

    empty: { alignItems: 'center', marginTop: 50, marginBottom: 20, gap: 8, paddingHorizontal: 24 },
    emptyTitle: { fontSize: 15, fontWeight: '700', color: '#475569' },
    emptyDesc: { fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },

    card: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', borderRadius: 14,
        paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8,
    },
    cardTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
    cardMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },
    cardStat: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
    cardBtns: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    sendBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#2563eb', borderRadius: 10,
        paddingHorizontal: 11, paddingVertical: 8,
    },
    sendText: { fontSize: 12, fontWeight: '700', color: '#fff' },
    iconBtn: {
        width: 32, height: 32, borderRadius: 8,
        alignItems: 'center', justifyContent: 'center',
    },

    createBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        backgroundColor: '#1e293b', borderRadius: 14, paddingVertical: 14, marginTop: 8,
    },
    createBtnOff: { backgroundColor: '#cbd5e1' },
    createText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    note: { fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 8 },
    noteWarn: { fontSize: 12, color: '#dc2626', textAlign: 'center', marginTop: 8 },
});
