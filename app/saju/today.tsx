import { useState } from 'react';
import {
    View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorNotice } from '@/components/saju/ErrorNotice';
import { GateNotice, useSajuGate } from '@/components/saju/SajuGate';
import { SajuShareButton } from '@/components/saju/SajuShareButton';
import { useSajuDaily } from '@/services/saju/queries';

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];
const OFFSETS = [-1, 0, 1] as const;
const OFFSET_LABEL: Record<number, string> = { [-1]: '어제', 0: '오늘', 1: '내일' };

function tone(score: number) {
    if (score >= 85) return { color: '#e11d48', word: '아주 좋음' };
    if (score >= 75) return { color: '#f59e0b', word: '좋음' };
    if (score >= 65) return { color: '#059669', word: '무난' };
    return { color: '#0284c7', word: '차분히' };
}

/** 'YYYY-MM-DD' → 'M월 D일 (요일)'. 서버가 KST 로 만든 문자열이라 파싱만 한다. */
function formatDate(dateKey: string): string {
    const [y, m, d] = dateKey.split('-').map(Number);
    return `${m}월 ${d}일 (${WEEKDAY[new Date(y, m - 1, d).getDay()]})`;
}

/**
 * 오늘의 사주.
 *
 * 계산은 전부 서버가 한다. 여기서는 어제·오늘·내일 세 건을 각각 받아 렌더만 한다.
 *
 * ⚠️ **오늘(offset 0)만 서버에 기록·동결된다.** 어제·내일은 스트립을 채우기 위한
 *    미리보기라 기록하지 않는다 — 기록하면 "본 것"으로 잡혀 포인트 판정이 어긋난다.
 */
export default function SajuTodayPage() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const gate = useSajuGate();
    const [offset, setOffset] = useState(0);

    const yesterday = useSajuDaily(-1);
    const today = useSajuDaily(0);
    const tomorrow = useSajuDaily(1);
    const byOffset = { [-1]: yesterday, 0: today, 1: tomorrow } as const;
    const current = byOffset[offset as -1 | 0 | 1];

    const f = current.data?.fortune;
    const t = f ? tone(f.score) : null;

    return (
        <View style={s.container}>
            <View style={s.nav}>
                <TouchableOpacity onPress={() => router.back()} style={s.navBack}>
                    <Ionicons name="chevron-back" size={24} color="#0f172a" />
                </TouchableOpacity>
                <Text style={s.navTitle}>오늘의 사주</Text>
                <View style={s.navBack} />
            </View>

            {gate.kind !== 'ok' ? (
                <GateNotice gate={gate} />
            ) : (
                <ScrollView
                    contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 32 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* 어제·오늘·내일 */}
                    <View style={s.strip}>
                        {OFFSETS.map((o) => {
                            const on = o === offset;
                            const d = byOffset[o].data?.fortune;
                            return (
                                <TouchableOpacity
                                    key={o}
                                    style={[s.stripItem, on && s.stripItemOn]}
                                    onPress={() => setOffset(o)}
                                    activeOpacity={0.85}
                                >
                                    <Text style={[s.stripLabel, on && s.stripLabelOn]}>
                                        {OFFSET_LABEL[o]}
                                    </Text>
                                    <Text style={[s.stripScore, on && s.stripScoreOn]}>
                                        {d ? `${d.score}점` : '—'}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {current.isError ? (
                        // 실패를 그리지 않으면 스피너가 영원히 돈다(retry:false).
                        <ErrorNotice error={current.error} onRetry={() => current.refetch()} />
                    ) : current.isLoading || !f ? (
                        <ActivityIndicator size="small" color="#60a5fa" style={{ marginTop: 40 }} />
                    ) : (
                        <>
                            {/* 점수 */}
                            <View style={s.hero}>
                                <Text style={s.heroDate}>{formatDate(f.dateKey)}</Text>
                                <Text style={[s.heroScore, { color: t!.color }]}>{f.score}점</Text>
                                <Text style={s.heroWord}>{t!.word} · {f.tag}</Text>
                                {f.relationText ? (
                                    <Text style={s.heroRelation}>{f.relationText}</Text>
                                ) : null}
                            </View>

                            {/* 항목별 */}
                            {f.sections.filter((x) => x.text).map((x) => (
                                <View key={x.key} style={s.section}>
                                    <Text style={s.sectionTitle}>{x.emoji} {x.label}</Text>
                                    <Text style={s.sectionText}>{x.text}</Text>
                                </View>
                            ))}

                            {/* 조언 */}
                            {f.advice ? (
                                <View style={s.advice}>
                                    <Text style={s.adviceLabel}>{OFFSET_LABEL[offset]}의 조언</Text>
                                    <Text style={s.adviceText}>{f.advice}</Text>
                                </View>
                            ) : null}

                            <SajuShareButton
                                title={`${OFFSET_LABEL[offset]}의 사주`}
                                lines={[
                                    `${OFFSET_LABEL[offset]}의 사주 (${f.dateKey})`,
                                    `오늘의 점수 ${f.score}점 · ${f.tag}`,
                                    '',
                                    ...f.sections.filter((x) => x.text).map((x) => `${x.emoji} ${x.label}\n${x.text}`),
                                    f.advice ? `\n💡 ${f.advice}` : '',
                                ]}
                            />

                            <Text style={s.foot}>
                                내 일주 {current.data!.myPillar.ganzhiKo} · 일간 {current.data!.myPillar.ganKo}
                            </Text>
                        </>
                    )}
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

    strip: { flexDirection: 'row', gap: 6, marginBottom: 10 },
    stripItem: {
        flex: 1, backgroundColor: '#fff', borderRadius: 12,
        paddingVertical: 10, alignItems: 'center',
    },
    stripItemOn: { backgroundColor: '#1e293b' },
    stripLabel: { fontSize: 12, color: '#94a3b8' },
    stripLabelOn: { color: '#cbd5e1' },
    stripScore: { fontSize: 15, fontWeight: '800', color: '#334155', marginTop: 2 },
    stripScoreOn: { color: '#fff' },

    hero: {
        backgroundColor: '#fff', borderRadius: 18,
        paddingVertical: 24, alignItems: 'center', marginBottom: 10,
    },
    heroDate: { fontSize: 12, color: '#94a3b8' },
    heroScore: { fontSize: 40, fontWeight: '800', marginTop: 4 },
    heroWord: { fontSize: 14, fontWeight: '600', color: '#475569', marginTop: 2 },
    heroRelation: {
        fontSize: 12, color: '#64748b', marginTop: 10,
        textAlign: 'center', paddingHorizontal: 24, lineHeight: 18,
    },

    section: {
        backgroundColor: '#fff', borderRadius: 14,
        paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8,
    },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
    sectionText: { fontSize: 13, color: '#475569', marginTop: 6, lineHeight: 21 },

    advice: {
        backgroundColor: '#1e293b', borderRadius: 14,
        paddingHorizontal: 16, paddingVertical: 14, marginTop: 4,
    },
    adviceLabel: { fontSize: 11, color: '#94a3b8' },
    adviceText: { fontSize: 14, fontWeight: '600', color: '#fff', marginTop: 4, lineHeight: 21 },

    foot: { fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 14 },
});
