import { useState } from 'react';
import {
    View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { TextInput } from '@/components/common/AppTextInput';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GateNotice, useSajuGate } from '@/components/saju/SajuGate';
import { SajuShareButton } from '@/components/saju/SajuShareButton';
import { usePointBalance, usePointPolicies, useCanChargePoint } from '@/services/point/queries';
import {
    SAJU_QUERY_KEYS, useDeleteSavedMatchTarget, useSajuMatch, useSavedMatchTargets,
} from '@/services/saju/queries';
import type { MatchInput, MatchResponse, SavedMatchTarget } from '@/services/saju/types';

const won = (n: number) => n.toLocaleString('ko-KR');

const EMPTY: MatchInput = {
    name: '',
    target: 'peer',
    calendar: 'solar',
    isLeapMonth: false,
    year: 1990,
    month: 1,
    day: 1,
    birthTime: null,
    gender: 'male',
};

function tone(score: number) {
    if (score >= 85) return { color: '#e11d48', word: '아주 좋음' };
    if (score >= 78) return { color: '#f59e0b', word: '좋음' };
    if (score >= 70) return { color: '#059669', word: '무난' };
    return { color: '#0284c7', word: '역할을 나누면' };
}

/**
 * 영업 궁합 (유료).
 *
 * 다른 유료 항목과 달리 **PointGate 를 못 쓴다** — 값은 고정이지만 '이미 낸 상대인가'
 * 는 상대를 입력해야 정해진다. 대신 값을 먼저 보여 주는 게이트를 화면 안에 둔다.
 *
 * 입력 폼을 게이트 뒤에 두는 이유: 남의 생년월일을 다 쳐 넣게 해 놓고 마지막에
 * "990P 입니다" 하면, 들인 수고가 아까워서 누르게 된다. 값부터 보여 주고 시작한다.
 */
export default function SajuMatchPage() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const qc = useQueryClient();
    const gate = useSajuGate();

    const [stage, setStage] = useState<'gate' | 'form'>('gate');
    const [form, setForm] = useState<MatchInput>(EMPTY);
    const [result, setResult] = useState<MatchResponse | null>(null);

    const match = useSajuMatch();
    const { data: balance } = usePointBalance();
    const { data: policies } = usePointPolicies();
    const { data: saved = [] } = useSavedMatchTargets();
    const { mutate: removeTarget } = useDeleteSavedMatchTarget();

    // 궁합 값은 상대와 무관하게 하나다. 상대마다 달라지는 건 '이미 냈는가' 뿐이라
    // 진입 시점에 값을 보여 줄 수 있다.
    const policy = policies?.find((x) => x.code === 'saju_match');
    const cost = balance?.enabled ? (policy?.amount ?? 0) : 0;
    const priceLoading = balance === undefined || policies === undefined;

    const set = <K extends keyof MatchInput>(k: K, v: MatchInput[K]) =>
        setForm((f) => ({ ...f, [k]: v }));

    const run = (input: MatchInput = form) => {
        match.mutate(input, {
            onSuccess: (d) => {
                setResult(d);
                qc.invalidateQueries({ queryKey: SAJU_QUERY_KEYS.savedTargets });
                qc.invalidateQueries({ queryKey: ['point-balance'] });
            },
        });
    };

    /** 목록에서 고른 상대 — 이미 결제했으므로 확인 없이 바로 연다. */
    const openSaved = (t: SavedMatchTarget) => {
        const [y, m, d] = t.birthDate.split('-').map(Number);
        const next: MatchInput = {
            ...EMPTY,
            name: t.name,
            calendar: t.calendar,
            year: y, month: m, day: d,
            birthTime: t.birthTime,
            gender: t.gender ?? 'male',
        };
        setForm(next);
        run(next);
    };

    const goBack = () => {
        if (result) { setResult(null); setStage('gate'); return; }
        if (stage === 'form') { setStage('gate'); return; }
        router.back();
    };

    return (
        <View style={s.container}>
            <View style={s.nav}>
                <TouchableOpacity onPress={goBack} style={s.navBack}>
                    <Ionicons name="chevron-back" size={24} color="#0f172a" />
                </TouchableOpacity>
                <Text style={s.navTitle}>영업 궁합</Text>
                <View style={s.navBack} />
            </View>

            {gate.kind !== 'ok' ? (
                <GateNotice gate={gate} />
            ) : (
                <ScrollView
                    contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 32 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {result ? (
                        <Result data={result} onAgain={() => { setResult(null); setStage('gate'); }} />
                    ) : priceLoading ? (
                        <ActivityIndicator size="small" color="#60a5fa" style={{ marginTop: 40 }} />
                    ) : stage === 'gate' && cost > 0 ? (
                        <Gate
                            cost={cost}
                            balance={balance?.balance ?? 0}
                            saved={saved}
                            busy={match.isPending}
                            onStart={() => { setForm(EMPTY); setStage('form'); }}
                            onOpenSaved={openSaved}
                            onRemove={removeTarget}
                        />
                    ) : (
                        <Form
                            form={form}
                            set={set}
                            cost={cost}
                            busy={match.isPending}
                            error={match.isError}
                            onSubmit={() => run()}
                        />
                    )}
                </ScrollView>
            )}
        </View>
    );
}

/** 진입 게이트 — 값을 먼저 보여 주고, 이미 본 상대는 여기서 바로 연다. */
function Gate({
    cost, balance, saved, busy, onStart, onOpenSaved, onRemove,
}: {
    cost: number;
    balance: number;
    saved: SavedMatchTarget[];
    busy: boolean;
    onStart: () => void;
    onOpenSaved: (t: SavedMatchTarget) => void;
    onRemove: (id: number) => void;
}) {
    const router = useRouter();
    const short = balance < cost;
    const canCharge = useCanChargePoint();

    return (
        <>
            <View style={s.gateCard}>
                <Ionicons name="people" size={34} color="#f59e0b" />
                <Text style={s.gateLabel}>영업 궁합</Text>
                <Text style={s.gateCost}>{won(cost)}P</Text>
                <Text style={s.gateDesc}>
                    한 사람당 한 번만 냅니다.{'\n'}같은 상대는 다시 봐도 무료입니다.
                </Text>
                <Text style={s.gateBalance}>보유 {won(balance)}P</Text>

                {short ? (
                    <>
                        <View style={s.shortBox}>
                            <Text style={s.shortText}>포인트가 {won(cost - balance)}P 부족합니다.</Text>
                        </View>
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
                    <TouchableOpacity style={s.primaryBtn} onPress={onStart} activeOpacity={0.85}>
                        <Text style={s.primaryText}>{won(cost)}P 사용하고 보기</Text>
                    </TouchableOpacity>
                )}
            </View>

            {saved.length > 0 && (
                <View style={s.savedCard}>
                    <View style={s.savedHead}>
                        <Text style={s.savedTitle}>이미 본 상대</Text>
                        <View style={s.freeBadge}><Text style={s.freeBadgeText}>무료</Text></View>
                    </View>
                    <Text style={s.savedNote}>
                        눌러서 바로 다시 봅니다. 지워도 다시 볼 때 돈이 들지 않습니다.
                    </Text>
                    {saved.map((t) => (
                        <View key={t.id} style={s.savedRow}>
                            <TouchableOpacity
                                style={{ flex: 1 }}
                                onPress={() => onOpenSaved(t)}
                                disabled={busy}
                                activeOpacity={0.8}
                            >
                                <Text style={s.savedName}>{t.name}</Text>
                                <Text style={s.savedMeta}>
                                    {t.birthDate}
                                    {t.calendar === 'lunar' ? ' (음)' : ''}
                                    {t.birthTime ? ` ${t.birthTime}` : ''}
                                    {`  ·  ${t.viewedAt.slice(0, 10)}`}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => onRemove(t.id)} style={s.savedDel}>
                                <Ionicons name="close" size={16} color="#cbd5e1" />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}
        </>
    );
}

const TARGETS = [
    { id: 'leader', label: '팀장' },
    { id: 'member', label: '팀원' },
    { id: 'peer', label: '동료' },
    { id: 'partner', label: '파트너' },
    { id: 'etc', label: '기타' },
] as const;

function Form({
    form, set, cost, busy, error, onSubmit,
}: {
    form: MatchInput;
    set: <K extends keyof MatchInput>(k: K, v: MatchInput[K]) => void;
    cost: number;
    busy: boolean;
    error: boolean;
    onSubmit: () => void;
}) {
    return (
        <View style={s.formCard}>
            <Text style={s.formTitle}>상대방 정보</Text>
            <Text style={s.formNote}>
                내 정보는 회원 정보에서 가져옵니다. 상대방 정보만 입력해 주세요.
                한 번 본 상대는 다시 봐도 무료입니다.
            </Text>

            <Text style={s.fieldLabel}>이름</Text>
            <TextInput
                style={s.input}
                value={form.name}
                onChangeText={(v: string) => set('name', v)}
                placeholder="김철수"
                maxLength={20}
            />

            <Text style={s.fieldLabel}>관계</Text>
            <View style={s.chipRow}>
                {TARGETS.map((t) => {
                    const on = form.target === t.id;
                    return (
                        <TouchableOpacity
                            key={t.id}
                            style={[s.chip, on && s.chipOn]}
                            onPress={() => set('target', t.id)}
                            activeOpacity={0.85}
                        >
                            <Text style={[s.chipText, on && s.chipTextOn]}>{t.label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <Text style={s.fieldLabel}>성별</Text>
            <View style={s.chipRow}>
                {(['male', 'female'] as const).map((g) => {
                    const on = form.gender === g;
                    return (
                        <TouchableOpacity
                            key={g}
                            style={[s.chip, on && s.chipOn]}
                            onPress={() => set('gender', g)}
                            activeOpacity={0.85}
                        >
                            <Text style={[s.chipText, on && s.chipTextOn]}>
                                {g === 'male' ? '남성' : '여성'}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <Text style={s.fieldLabel}>생년월일</Text>
            <View style={s.chipRow}>
                {(['solar', 'lunar'] as const).map((c) => {
                    const on = form.calendar === c;
                    return (
                        <TouchableOpacity
                            key={c}
                            style={[s.chip, on && s.chipOn]}
                            onPress={() => set('calendar', c)}
                            activeOpacity={0.85}
                        >
                            <Text style={[s.chipText, on && s.chipTextOn]}>
                                {c === 'solar' ? '양력' : '음력'}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
            <View style={s.dateRow}>
                <TextInput
                    style={[s.input, s.dateInput]}
                    value={String(form.year ?? '')}
                    onChangeText={(v: string) => set('year', Number(v.replace(/[^0-9]/g, '')) || 0)}
                    keyboardType="number-pad"
                    maxLength={4}
                    placeholder="1990"
                />
                <TextInput
                    style={[s.input, s.dateInput]}
                    value={String(form.month ?? '')}
                    onChangeText={(v: string) => set('month', Number(v.replace(/[^0-9]/g, '')) || 0)}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="월"
                />
                <TextInput
                    style={[s.input, s.dateInput]}
                    value={String(form.day ?? '')}
                    onChangeText={(v: string) => set('day', Number(v.replace(/[^0-9]/g, '')) || 0)}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="일"
                />
            </View>

            <Text style={s.fieldLabel}>
                태어난 시각 <Text style={s.fieldHint}>몰라도 됩니다</Text>
            </Text>
            <TextInput
                style={s.input}
                value={form.birthTime ?? ''}
                onChangeText={(v: string) => set('birthTime', v || null)}
                placeholder="14:30"
                maxLength={5}
            />
            <Text style={s.formNote}>
                시각을 몰라도 궁합은 나옵니다. 핵심인 일간·일지는 날짜만으로 정해지기 때문입니다.
            </Text>

            <TouchableOpacity
                style={[s.primaryBtn, busy && { opacity: 0.6 }]}
                onPress={onSubmit}
                disabled={busy}
                activeOpacity={0.85}
            >
                <Text style={s.primaryText}>
                    {busy ? '보는 중…' : `영업 궁합 보기${cost > 0 ? ` (${won(cost)}P)` : ''}`}
                </Text>
            </TouchableOpacity>

            {error ? (
                <Text style={s.errorText}>잠시 후 다시 시도해 주세요.</Text>
            ) : null}
        </View>
    );
}

function Result({ data, onAgain }: { data: MatchResponse; onAgain: () => void }) {
    const t = tone(data.score);
    // 상대 이름은 성만 남기고 가린다 — 캡처해서 단톡방에 올릴 수도 있는 글이다.
    const masked = data.them.name ? `${data.them.name[0]}○○` : '상대';

    return (
        <>
            <View style={s.hero}>
                <Text style={s.heroWho}>{data.me.name}님 × {data.them.name}님</Text>
                <Text style={[s.heroScore, { color: t.color }]}>{data.score}점</Text>
                <Text style={s.heroWord}>{t.word}</Text>
                <Text style={s.heroMeta}>
                    {data.me.ganKo} × {data.them.ganKo} · {data.them.targetLabel}
                </Text>
            </View>

            {data.sections.filter((x) => x.text).map((x) => (
                <View key={x.label} style={s.section}>
                    <Text style={s.sectionTitle}>{x.emoji} {x.label}</Text>
                    <Text style={s.sectionText}>{x.text}</Text>
                </View>
            ))}

            <SajuShareButton
                title="영업 궁합"
                lines={[
                    `${data.me.name}님 × ${masked}님`,
                    `영업 궁합 ${data.score}점`,
                    '',
                    ...data.sections.filter((x) => x.text).map((x) => `${x.emoji} ${x.label}\n${x.text}`),
                ]}
            />

            <TouchableOpacity style={s.againBtn} onPress={onAgain} activeOpacity={0.85}>
                <Ionicons name="refresh" size={16} color="#475569" />
                <Text style={s.againText}>다시 보기</Text>
            </TouchableOpacity>
        </>
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

    gateCard: {
        backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0',
        padding: 24, alignItems: 'center',
    },
    gateLabel: { fontSize: 15, fontWeight: '700', color: '#334155', marginTop: 10 },
    gateCost: { fontSize: 30, fontWeight: '800', color: '#0f172a', marginTop: 2 },
    gateDesc: { fontSize: 13, color: '#64748b', marginTop: 10, textAlign: 'center', lineHeight: 19 },
    gateBalance: { fontSize: 13, color: '#94a3b8', marginTop: 14 },

    shortBox: {
        backgroundColor: '#fef2f2', borderRadius: 10,
        paddingHorizontal: 12, paddingVertical: 8, marginTop: 14, alignSelf: 'stretch',
    },
    shortText: { fontSize: 13, color: '#dc2626', textAlign: 'center' },

    savedCard: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginTop: 10 },
    savedHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    savedTitle: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
    freeBadge: { backgroundColor: '#ecfdf5', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
    freeBadgeText: { fontSize: 10, fontWeight: '700', color: '#059669' },
    savedNote: { fontSize: 11, color: '#94a3b8', marginTop: 4, lineHeight: 16 },
    savedRow: {
        flexDirection: 'row', alignItems: 'center',
        borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingVertical: 10, marginTop: 6,
    },
    savedName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
    savedMeta: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
    savedDel: { padding: 6 },

    formCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
    formTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
    formNote: { fontSize: 11, color: '#94a3b8', marginTop: 6, lineHeight: 17 },
    fieldLabel: { fontSize: 12, fontWeight: '700', color: '#475569', marginTop: 16, marginBottom: 6 },
    fieldHint: { fontSize: 11, fontWeight: '400', color: '#94a3b8' },
    input: {
        borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#0f172a',
        backgroundColor: '#fff',
    },
    dateRow: { flexDirection: 'row', gap: 8 },
    dateInput: { flex: 1, textAlign: 'center' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: {
        borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 999,
        paddingHorizontal: 14, paddingVertical: 8,
    },
    chipOn: { backgroundColor: '#1e293b', borderColor: '#1e293b' },
    chipText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
    chipTextOn: { color: '#fff' },

    primaryBtn: {
        backgroundColor: '#2563eb', borderRadius: 12,
        paddingVertical: 13, marginTop: 16, alignSelf: 'stretch', alignItems: 'center',
    },
    primaryText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    ghostBtn: { paddingVertical: 10, marginTop: 4 },
    ghostText: { fontSize: 12, color: '#94a3b8' },
    errorText: { fontSize: 12, color: '#ef4444', textAlign: 'center', marginTop: 10 },

    hero: {
        backgroundColor: '#fff', borderRadius: 18,
        paddingVertical: 24, alignItems: 'center', marginBottom: 10,
    },
    heroWho: { fontSize: 13, color: '#64748b' },
    heroScore: { fontSize: 40, fontWeight: '800', marginTop: 4 },
    heroWord: { fontSize: 14, fontWeight: '600', color: '#475569' },
    heroMeta: { fontSize: 11, color: '#94a3b8', marginTop: 8 },

    section: {
        backgroundColor: '#fff', borderRadius: 14,
        paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8,
    },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
    sectionText: { fontSize: 13, color: '#475569', marginTop: 6, lineHeight: 21 },

    againBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        backgroundColor: '#e2e8f0', borderRadius: 14, paddingVertical: 13, marginTop: 8,
    },
    againText: { fontSize: 14, fontWeight: '600', color: '#475569' },
});
