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
import { useSajuNatal } from '@/services/saju/queries';
import { ELEMENTS } from '@/services/saju/types';

/** 오행별 색 — 전통 배색(목=청, 화=적, 토=황, 금=백, 수=흑)을 화면용으로 옮긴 것. */
const EL: Record<string, string> = {
    목: '#10b981', 화: '#f43f5e', 토: '#f59e0b', 금: '#94a3b8', 수: '#3b82f6',
};

function firstParagraph(text: string | null, max = 120): string {
    if (!text) return '';
    const head = text.split('\n\n')[0].trim();
    return head.length > max ? `${head.slice(0, max - 1)}…` : head;
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
    return (
        <View style={s.section}>
            <Text style={s.sectionTitle}>{title}</Text>
            {sub ? <Text style={s.sectionSub}>{sub}</Text> : null}
            <View style={{ marginTop: 8 }}>{children}</View>
        </View>
    );
}

/**
 * 평생 총운 (유료).
 *
 * 웹은 명식 4주를 표로 넓게 펼치는데, 앱은 가로가 좁아 그대로 옮기면 글자가 뭉갠다.
 * 기둥 하나를 카드로 세워 가로 스크롤한다 — 정보는 같고 읽기만 다르다.
 */
export default function SajuNatalPage() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const gate = useSajuGate();

    return (
        <View style={s.container}>
            <View style={s.nav}>
                <TouchableOpacity onPress={() => router.back()} style={s.navBack}>
                    <Ionicons name="chevron-back" size={24} color="#0f172a" />
                </TouchableOpacity>
                <Text style={s.navTitle}>평생 총운</Text>
                <View style={s.navBack} />
            </View>

            {gate.kind !== 'ok' ? (
                <GateNotice gate={gate} />
            ) : (
                <PointGate code="saju_life">
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
    const { data, isLoading } = useSajuNatal(ready);

    if (isLoading || !data) {
        return <ActivityIndicator size="small" color="#60a5fa" style={{ marginTop: 40 }} />;
    }

    const { result: r, texts, name } = data;
    const maxCount = Math.max(...ELEMENTS.map((e) => r.elementCounts[e] ?? 0), 1);

    return (
        <>
            {/* 일간 — 이 사람의 뿌리 */}
            <View style={s.hero}>
                <Text style={s.heroLabel}>{name}님의 일간</Text>
                <Text style={s.heroGan}>{r.ilgan.ko} ({r.ilgan.hanja})</Text>
                {texts.ilgan.title ? <Text style={s.heroTitle}>{texts.ilgan.title}</Text> : null}
                {texts.ilgan.desc ? <Text style={s.heroDesc}>{texts.ilgan.desc}</Text> : null}
            </View>

            {/* 명식 — 가로 스크롤. 앱 가로폭에 4주를 표로 넣으면 뭉갠다 */}
            <Section title="사주 명식" sub="옆으로 밀어서 네 기둥을 봅니다">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        {r.pillars.map((p) => (
                            <View key={p.label} style={s.pillar}>
                                <Text style={s.pillarLabel}>{p.label}</Text>
                                <Text style={[s.pillarGan, { color: EL[p.cheongan.element] ?? '#334155' }]}>
                                    {p.cheongan.ko}
                                </Text>
                                <Text style={[s.pillarJi, { color: EL[p.jiji.element] ?? '#334155' }]}>
                                    {p.jiji.ko}
                                </Text>
                                <Text style={s.pillarMeta}>{p.ganzhiKo}</Text>
                                {p.cheongan.sipsin ? (
                                    <Text style={s.pillarMeta}>{p.cheongan.sipsin}</Text>
                                ) : null}
                                <Text style={s.pillarMeta}>{p.jiji.unseong}</Text>
                            </View>
                        ))}
                    </View>
                </ScrollView>
            </Section>

            {/* 오행 */}
            <Section title="오행 분포" sub="많고 적음이 성향과 약점을 만듭니다">
                {ELEMENTS.map((e) => {
                    const n = r.elementCounts[e] ?? 0;
                    return (
                        <View key={e} style={s.elRow}>
                            <Text style={s.elName}>{e}</Text>
                            <View style={s.elTrack}>
                                <View
                                    style={[s.elBar, {
                                        width: `${(n / maxCount) * 100}%`,
                                        backgroundColor: EL[e],
                                    }]}
                                />
                            </View>
                            <Text style={s.elCount}>{n}</Text>
                        </View>
                    );
                })}
                {texts.elementStrong?.text ? (
                    <Text style={s.body}>{texts.elementStrong.text}</Text>
                ) : null}
                {texts.yongsin?.text ? <Text style={s.body}>{texts.yongsin.text}</Text> : null}
            </Section>

            {/* 평생 파트 */}
            {texts.money ? (
                <Section title="재물운" sub="돈을 버는 방식과 새는 자리">
                    <Text style={s.body}>{texts.money}</Text>
                </Section>
            ) : null}
            {texts.job ? (
                <Section title="직업 · 사업운" sub="어떤 자리에서 힘이 나는가">
                    <Text style={s.body}>{texts.job}</Text>
                </Section>
            ) : null}
            {texts.relationship ? (
                <Section title="인간관계" sub="사람을 대하는 방식과 잘 맞는 유형">
                    <Text style={s.body}>{texts.relationship}</Text>
                </Section>
            ) : null}

            {/* 대운 흐름 */}
            {texts.decades.length > 0 && (
                <Section title="연령대별 흐름" sub="10년 단위로 바뀌는 큰 흐름">
                    {texts.decades.map((d) => (
                        <View key={d.startAge} style={[s.decade, d.isCurrent && s.decadeNow]}>
                            <View style={s.decadeHead}>
                                <Text style={[s.decadeLabel, d.isCurrent && s.decadeLabelNow]}>
                                    {d.label}{d.isCurrent ? ' · 지금' : ''}
                                </Text>
                                <Text style={s.decadeAge}>{d.startAge}~{d.endAge}세</Text>
                            </View>
                            {d.text ? <Text style={s.decadeText}>{d.text}</Text> : null}
                        </View>
                    ))}
                </Section>
            )}

            {/* 전성기 · 관리기 — '나쁜 운'이라고 쓰지 않는다.
                바꿀 수 없는 것을 나쁘다고 하면 서비스를 닫는다. */}
            {(texts.peak || texts.caution) && (
                <Section title="가장 강한 시기와 관리가 필요한 시기">
                    {texts.peak ? (
                        <View style={[s.phase, { backgroundColor: '#fff1f2' }]}>
                            <Text style={[s.phaseLabel, { color: '#be123c' }]}>
                                내 인생의 전성기 — {texts.peak.label} ({texts.peak.startYear}~{texts.peak.endYear})
                            </Text>
                            {texts.peak.text ? <Text style={s.phaseText}>{texts.peak.text}</Text> : null}
                        </View>
                    ) : null}
                    {texts.caution ? (
                        <View style={[s.phase, { backgroundColor: '#fffbeb', marginTop: 8 }]}>
                            <Text style={[s.phaseLabel, { color: '#b45309' }]}>
                                관리가 중요한 시기 — {texts.caution.label} ({texts.caution.startYear}~{texts.caution.endYear})
                            </Text>
                            {texts.caution.text ? <Text style={s.phaseText}>{texts.caution.text}</Text> : null}
                        </View>
                    ) : null}
                </Section>
            )}

            {texts.summary ? (
                <Section title="올해의 한 줄">
                    <Text style={s.body}>{texts.summary}</Text>
                </Section>
            ) : null}

            {/* 원국·오행·대운을 다 넣으면 소설이 된다.
                사람들이 실제로 옮기는 "나는 어떤 사람인가" 쪽만 보낸다. */}
            <SajuShareButton
                title="내 평생 총운"
                lines={[
                    `${name}님의 평생 총운`,
                    texts.ilgan.title ? `일간 ${r.ilgan.ko} · ${texts.ilgan.title}` : '',
                    '',
                    texts.job ? `💼 직업·사업\n${firstParagraph(texts.job)}` : '',
                    texts.money ? `💰 재물\n${firstParagraph(texts.money)}` : '',
                    texts.relationship ? `👥 인간관계\n${firstParagraph(texts.relationship)}` : '',
                    texts.peak ? `\n✨ 전성기 ${texts.peak.label} (${texts.peak.startYear}~${texts.peak.endYear})` : '',
                ]}
            />
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
        padding: 20, alignItems: 'center', marginBottom: 8,
    },
    heroLabel: { fontSize: 12, color: '#94a3b8' },
    heroGan: { fontSize: 26, fontWeight: '800', color: '#0f172a', marginTop: 4 },
    heroTitle: { fontSize: 14, fontWeight: '700', color: '#2563eb', marginTop: 6 },
    heroDesc: { fontSize: 13, color: '#475569', marginTop: 8, textAlign: 'center', lineHeight: 21 },

    section: {
        backgroundColor: '#fff', borderRadius: 14,
        paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8,
    },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
    sectionSub: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
    body: { fontSize: 13, color: '#475569', marginTop: 8, lineHeight: 21 },

    pillar: {
        width: 74, backgroundColor: '#f8fafc', borderRadius: 12,
        paddingVertical: 12, alignItems: 'center',
    },
    pillarLabel: { fontSize: 11, color: '#94a3b8' },
    pillarGan: { fontSize: 22, fontWeight: '800', marginTop: 4 },
    pillarJi: { fontSize: 22, fontWeight: '800' },
    pillarMeta: { fontSize: 10, color: '#94a3b8', marginTop: 3 },

    elRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    elName: { width: 18, fontSize: 12, fontWeight: '700', color: '#475569' },
    elTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: '#f1f5f9', overflow: 'hidden' },
    elBar: { height: 8, borderRadius: 4 },
    elCount: { width: 16, fontSize: 12, color: '#94a3b8', textAlign: 'right' },

    decade: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, marginBottom: 6 },
    decadeNow: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' },
    decadeHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    decadeLabel: { fontSize: 13, fontWeight: '700', color: '#334155' },
    decadeLabelNow: { color: '#1d4ed8' },
    decadeAge: { fontSize: 11, color: '#94a3b8' },
    decadeText: { fontSize: 12, color: '#64748b', marginTop: 6, lineHeight: 19 },

    phase: { borderRadius: 12, padding: 12 },
    phaseLabel: { fontSize: 12, fontWeight: '700' },
    phaseText: { fontSize: 13, color: '#475569', marginTop: 6, lineHeight: 21 },
});
