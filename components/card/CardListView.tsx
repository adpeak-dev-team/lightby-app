import { useCallback, useState } from 'react';
import {
    View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/common/AppText';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tokenStorage } from '@/api/apiClient';
import { IMAGE_PREFIX } from '@/lib/constants';
import { ShareSheet } from '@/components/card/ShareSheet';
import { TEMPLATE_SWATCH } from '@/components/card/templates';
import { useCards } from '@/services/card/queries';
import { usePointBalance, usePointPolicies } from '@/services/point/queries';
import type { CardListItem } from '@/services/card/types';

const won = (n: number) => n.toLocaleString('ko-KR');

/**
 * 모바일 명함.
 *
 * 현장이 바뀌면 **새 명함을 만든다.** 기존 것을 고치면 예전에 뿌린 링크까지 새
 * 현장으로 바뀌어 받은 사람이 오해한다. 그래서 한 사람이 여러 장을 갖는다.
 *
 * 제작에 포인트가 든다(첫 장은 무료). 값은 만들기 전에 보여 준다 — 다 만들고
 * 저장할 때 "부족합니다" 가 뜨면 들인 수고가 통째로 날아간다.
 *
 * 만들기·수정은 **다른 주소**다(/card/new, /card/modify/{id}). 한 화면에서 상태로
 * 갈아 끼우면 뒤로가기가 목록이 아니라 앱 밖으로 나간다.
 */
export function CardListView() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // 탭이라 비로그인 상태에서도 열린다. 토큰이 확정되기 전에는 조회하지 않는다.
    const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
    useFocusEffect(
        useCallback(() => {
            let active = true;
            tokenStorage.get().then((t) => { if (active) setIsLoggedIn(!!t); });
            return () => { active = false; };
        }, []),
    );

    const { data: cards, isLoading } = useCards(isLoggedIn === true);
    const { data: balance } = usePointBalance(isLoggedIn === true);
    const { data: policies } = usePointPolicies();
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
        router.push('/card/new' as never);
    };

    if (isLoggedIn === false) {
        return (
            <View style={[s.container, s.center]}>
                <Ionicons name="id-card-outline" size={44} color="#cbd5e1" />
                <Text style={s.emptyTitle}>로그인이 필요합니다</Text>
                <Text style={s.emptyDesc}>
                    로그인하면 현장별 모바일 명함을 만들어{'\n'}카톡·문자로 바로 보낼 수 있습니다.
                </Text>
                <TouchableOpacity
                    style={s.loginBtn}
                    onPress={() => router.push('/auth/login')}
                    activeOpacity={0.85}
                >
                    <Text style={s.loginBtnText}>로그인하러 가기</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={s.container}>
            <ScrollView
                contentContainerStyle={{
                    padding: 12,
                    // 탭바가 목록 마지막 줄을 덮는다
                    paddingBottom: insets.bottom + 100,
                }}
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
                        <CardRow
                            key={c.id}
                            card={c}
                            onEdit={() => router.push({
                                pathname: '/card/modify/[id]',
                                params: { id: String(c.id) },
                            } as never)}
                            onSend={() => setSharing(c)}
                        />
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

/**
 * 목록 한 줄. 웹 /card 와 같은 구조다 —
 * 왼쪽 썸네일(템플릿 색 + 사진), 가운데 제목·소속·실적, 오른쪽 '보내기'.
 *
 * 왼쪽과 가운데 **어디를 눌러도 수정**으로 들어간다. 줄마다 작은 아이콘 버튼을
 * 늘어놓으면 손가락으로 정확히 골라야 해서 오조작이 난다. 삭제는 수정 화면 안에
 * 둔다 — 목록에서 한 번에 지워지면 안 되는 물건이다(이미 뿌린 링크가 죽는다).
 */
function CardRow({
    card, onEdit, onSend,
}: {
    card: CardListItem;
    onEdit: () => void;
    onSend: () => void;
}) {
    const swatch = TEMPLATE_SWATCH[card.templateId] ?? TEMPLATE_SWATCH.minimal;
    const photo = card.photoPath
        ? (card.photoPath.startsWith('http') ? card.photoPath : `${IMAGE_PREFIX}${card.photoPath}`)
        : null;
    const sub = [card.name, card.position, card.company].filter(Boolean).join(' · ');

    return (
        <View style={s.card}>
            <TouchableOpacity onPress={onEdit} activeOpacity={0.8} accessibilityLabel="명함 수정">
                <LinearGradient
                    colors={swatch}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={s.thumb}
                >
                    {photo && <Image source={{ uri: photo }} style={s.thumbPhoto} />}
                </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={s.cardBody} onPress={onEdit} activeOpacity={0.8}>
                <Text style={s.cardTitle} numberOfLines={1}>
                    {card.title || card.siteName || '제목 없음'}
                </Text>
                <Text style={s.cardMeta} numberOfLines={1}>{sub || '—'}</Text>
                <View style={s.statRow}>
                    <Stat icon="paper-plane-outline" value={card.stats.sent} label="발송" />
                    <Stat icon="eye-outline" value={card.stats.viewed} label="열람" />
                </View>
            </TouchableOpacity>

            <TouchableOpacity style={s.sendBtn} onPress={onSend} activeOpacity={0.85}>
                <Ionicons name="share-social-outline" size={14} color="#2563eb" />
                <Text style={s.sendText}>보내기</Text>
            </TouchableOpacity>
        </View>
    );
}

function Stat({
    icon, value, label,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    value: number;
    label: string;
}) {
    return (
        <View style={s.stat}>
            <Ionicons name={icon} size={12} color="#94a3b8" />
            <Text style={s.statValue}>{value}</Text>
            <Text style={s.statLabel}>{label}</Text>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f1f5f9' },
    center: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 32 },
    empty: { alignItems: 'center', marginTop: 50, marginBottom: 20, gap: 8, paddingHorizontal: 24 },
    emptyTitle: { fontSize: 15, fontWeight: '700', color: '#475569' },
    emptyDesc: { fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },
    loginBtn: {
        marginTop: 20, backgroundColor: '#60a5fa',
        paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12,
    },
    loginBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },

    card: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 12,
        backgroundColor: '#fff', borderRadius: 16,
        borderWidth: 1, borderColor: '#e2e8f0',
        padding: 12, marginBottom: 8,
    },
    thumb: { width: 60, height: 84, borderRadius: 12, overflow: 'hidden' },
    thumbPhoto: { width: '100%', height: '100%', opacity: 0.9 },
    cardBody: { flex: 1, minWidth: 0 },
    cardTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
    cardMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },
    statRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
    stat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    statValue: { fontSize: 11, fontWeight: '700', color: '#334155' },
    statLabel: { fontSize: 11, color: '#94a3b8' },
    sendBtn: {
        alignSelf: 'center',
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#eff6ff', borderRadius: 12,
        paddingHorizontal: 12, paddingVertical: 10,
    },
    sendText: { fontSize: 12, fontWeight: '700', color: '#2563eb' },

    createBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        backgroundColor: '#1e293b', borderRadius: 14, paddingVertical: 14, marginTop: 8,
    },
    createBtnOff: { backgroundColor: '#cbd5e1' },
    createText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    note: { fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 8 },
    noteWarn: { fontSize: 12, color: '#dc2626', textAlign: 'center', marginTop: 8 },
});
