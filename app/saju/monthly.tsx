import {
    View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GateNotice, useSajuGate } from '@/components/saju/SajuGate';
import { PointGate } from '@/components/saju/PointGate';
import { SajuShareButton } from '@/components/saju/SajuShareButton';
import { useSajuMonthly } from '@/services/saju/queries';
import type { DayRange } from '@/services/saju/types';

function tone(score: number) {
    if (score >= 85) return { color: '#e11d48', word: '아주 좋음' };
    if (score >= 75) return { color: '#f59e0b', word: '좋음' };
    if (score >= 65) return { color: '#059669', word: '무난' };
    return { color: '#0284c7', word: '차분히' };
}

/** 섹션이 300자씩이라 공유 글에 통째로 넣으면 아무도 안 읽는다. 첫 문단만 보낸다. */
function firstParagraph(text: string | null, max = 120): string {
    if (!text) return '';
    const head = text.split('\n\n')[0].trim();
    return head.length > max ? `${head.slice(0, max - 1)}…` : head;
}

function Ranges({ label, ranges, tint }: { label: string; ranges: DayRange[]; tint: string }) {
    if (!ranges?.length) return null;
    return (
        <View style={s.rangeRow}>
            <Text style={s.rangeLabel}>{label}</Text>
            <View style={s.rangeChips}>
                {ranges.map((r, i) => (
                    <View key={i} style={[s.chip, { backgroundColor: tint }]}>
                        <Text style={s.chipText}>
                            {r.start === r.end ? `${r.start}일` : `${r.start}~${r.end}일`}
                        </Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

/**
 * 이번달 운세 (유료).
 *
 * PointGate 가 확인을 받기 전에는 조회를 켜지 않는다 — 결과를 저장하지 않는
 * 항목이라 화면에 들어온 것만으로 호출하면 부를 때마다 과금된다.
 */
export default function SajuMonthlyPage() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const gate = useSajuGate();

    return (
        <View style={s.container}>
            <View style={s.nav}>
                <TouchableOpacity onPress={() => router.back()} style={s.navBack}>
                    <Ionicons name="chevron-back" size={24} color="#0f172a" />
                </TouchableOpacity>
                <Text style={s.navTitle}>이번달 운세</Text>
                <View style={s.navBack} />
            </View>

            {gate.kind !== 'ok' ? (
                <GateNotice gate={gate} />
            ) : (
                <PointGate code="saju_monthly">
                    {(ready) => (
                        <ScrollView
                            contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 32 }}
                            showsVerticalScrollIndicator={false}
                        >
                            <Body ready={ready} />
                        </ScrollView>
                    )}
                </PointGate>
            )}
        </View>
    );
}

function Body({ ready }: { ready: boolean }) {
    const { data, isLoading } = useSajuMonthly(ready);

    if (isLoading || !data) {
        return <ActivityIndicator size="small" color="#60a5fa" style={{ marginTop: 40 }} />;
    }

    const t = tone(data.score);
    const total = data.sections.find((x) => x.key === 'total');
    const rest = data.sections.filter((x) => x.key !== 'total' && x.text);

    return (
        <>
            <View style={s.hero}>
                <Text style={s.heroDate}>{data.monthKey.replace('-', '년 ')}월</Text>
                <Text style={[s.heroScore, { color: t.color }]}>{data.score}점</Text>
                <Text style={s.heroWord}>{t.word} · {data.relationLabel}</Text>
            </View>

            {/* 총운 — 본문 + 마무리를 두 문단으로 */}
            {(total?.text || data.closing) && (
                <View style={s.section}>
                    <Text style={s.sectionTitle}>{total?.emoji} {total?.label ?? '이번 달 총운'}</Text>
                    {total?.text ? <Text style={s.sectionText}>{total.text}</Text> : null}
                    {data.closing ? <Text style={s.sectionText}>{data.closing}</Text> : null}
                </View>
            )}

            {/* 시기 — 일자가 아니라 구간으로 준다 */}
            <View style={s.section}>
                <Ranges label="계약운이 좋은 시기" ranges={data.ranges.contract} tint="#ecfdf5" />
                <Ranges label="재물운이 좋은 시기" ranges={data.ranges.money} tint="#eff6ff" />
                <Ranges label="중요한 결정은 피하면 좋은 시기" ranges={data.ranges.avoid} tint="#fef2f2" />
            </View>

            {rest.map((x) => (
                <View key={x.key} style={s.section}>
                    <Text style={s.sectionTitle}>{x.emoji} {x.label}</Text>
                    <Text style={s.sectionText}>{x.text}</Text>
                </View>
            ))}

            <SajuShareButton
                title="이번달 운세"
                lines={[
                    `이번달 운세 (${data.monthKey})`,
                    `이달의 점수 ${data.score}점 · ${data.relationLabel}`,
                    '',
                    ...data.sections
                        .filter((x) => x.text)
                        .map((x) => `${x.emoji} ${x.label}\n${firstParagraph(x.text)}`),
                ]}
            />

            <Text style={s.foot}>
                내 일주 {data.myPillar.ganzhiKo} · 일간 {data.myPillar.ganKo}
            </Text>
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

    hero: {
        backgroundColor: '#fff', borderRadius: 18,
        paddingVertical: 24, alignItems: 'center', marginBottom: 10,
    },
    heroDate: { fontSize: 12, color: '#94a3b8' },
    heroScore: { fontSize: 40, fontWeight: '800', marginTop: 4 },
    heroWord: { fontSize: 14, fontWeight: '600', color: '#475569', marginTop: 2 },

    section: {
        backgroundColor: '#fff', borderRadius: 14,
        paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8,
    },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
    sectionText: { fontSize: 13, color: '#475569', marginTop: 8, lineHeight: 21 },

    rangeRow: { marginBottom: 10 },
    rangeLabel: { fontSize: 12, fontWeight: '600', color: '#64748b' },
    rangeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
    chip: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
    chipText: { fontSize: 12, color: '#334155', fontWeight: '600' },

    foot: { fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 14 },
});
