import { useEffect, useMemo, useState } from 'react';
import {
    View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { TextInput } from '@/components/common/AppTextInput';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CardPreview } from '@/components/card/CardPreview';
import { useCard, useCreateCard, useUpdateCard } from '@/services/card/queries';
import { usePointBalance, usePointPolicies } from '@/services/point/queries';
import { useGetUserProfile } from '@/services/user/queries';
import type { CardPayload, TemplateId } from '@/services/card/types';

const won = (n: number) => n.toLocaleString('ko-KR');

const TEMPLATES: { id: TemplateId; name: string }[] = [
    { id: 'minimal', name: '미니멀' },
    { id: 'navy', name: '네이비' },
    { id: 'lightning', name: '번개 블루' },
    { id: 'dark', name: '모던 다크' },
    { id: 'warm', name: '베이지' },
    { id: 'luxe', name: '골드 라인' },
    { id: 'aurora', name: '오로라' },
    { id: 'sidebar', name: '사이드바' },
    { id: 'fresh', name: '프레시' },
    { id: 'photo', name: '포토' },
];

/**
 * 새 명함의 출발점.
 *
 * 빈 값으로 두면 미리보기가 텅 비어서, 들어온 사람이 이 화면이 뭘 만드는 건지 못 본다.
 * 완성된 걸 먼저 보여 주고 고치게 하는 쪽이 빈 칸을 하나씩 채우게 하는 것보다 빠르다.
 * 이름·전화·소개는 아래에서 회원 정보의 진짜 값으로 덮어쓴다.
 */
const SAMPLE: CardPayload = {
    title: null,
    templateId: 'minimal',
    name: '홍길동',
    position: '분양팀장',
    company: '번개분양대행',
    siteName: '래미안 원베일리',
    phone: '010-1234-5678',
    email: null,
    region: '서울 서초구',
    slogan: '현장을 가장 잘 아는 사람이 되겠습니다.\n언제든 편하게 연락 주세요.',
    tags: ['아파트', '오피스텔', '10년 경력'],
    photoPath: null,
    photoStyle: 'id',
};

/** 회원 정보 값이 명함에 써도 될 값인가. "222", "ㅇㅇ" 를 넣어 둔 계정이 실제로 있다. */
function usableText(v: string | null | undefined, min: number): string | null {
    const t = (v ?? '').trim();
    if (t.length < min) return null;
    if (!/[가-힣a-zA-Z]/.test(t)) return null;
    if (new Set(t.replace(/\s/g, '')).size <= 1) return null;
    return t;
}
function usablePhone(v: string | null | undefined): string | null {
    const t = (v ?? '').trim();
    return t.replace(/[^0-9]/g, '').length >= 9 ? t : null;
}

export default function CardEditPage() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const qc = useQueryClient();
    const { id } = useLocalSearchParams<{ id?: string }>();
    const cardId = id ? Number(id) : null;

    const { data: existing, isLoading } = useCard(cardId ?? 0);
    const { data: profile } = useGetUserProfile();
    const { data: balance } = usePointBalance();
    const { data: policies } = usePointPolicies();
    const create = useCreateCard();
    const update = useUpdateCard();

    const [payload, setPayload] = useState<CardPayload>(SAMPLE);
    const [prefilled, setPrefilled] = useState(false);
    const [tagDraft, setTagDraft] = useState('');

    // 수정이면 서버 값으로 시작한다.
    useEffect(() => {
        if (existing) setPayload({ ...existing });
    }, [existing]);

    // 새로 만들 때만 회원 정보를 채운다.
    // ⚠️ 수정에는 적용하지 않는다 — 저장해 둔 명함이 프로필 값으로 되돌아가면
    //    현장마다 다른 번호를 쓰는 사람에게는 사고다.
    useEffect(() => {
        if (cardId || prefilled || !profile) return;
        setPrefilled(true);
        setPayload((p) => ({
            ...p,
            name: usableText(profile.name, 2) ?? usableText(profile.nickname, 2) ?? p.name,
            phone: usablePhone(profile.phone) ?? p.phone,
            slogan: usableText(profile.introduction, 6) ?? p.slogan,
        }));
    }, [cardId, prefilled, profile]);

    const set = <K extends keyof CardPayload>(k: K, v: CardPayload[K]) =>
        setPayload((p) => ({ ...p, [k]: v }));

    const policy = balance?.enabled ? policies?.find((x) => x.code === 'card_create') : undefined;
    const freeLeft = policy?.freeLeft ?? 0;
    const cost = !cardId && policy && freeLeft === 0 ? policy.amount : 0;

    // 미리보기로 보낼 값. 매 글자마다 새 객체를 만들면 WebView 가 계속 다시 그린다.
    const previewCard = useMemo(() => payload, [payload]);

    const save = () => {
        if (!payload.name?.trim()) {
            Alert.alert('이름을 입력해 주세요.');
            return;
        }

        const done = (msg: string) => {
            qc.invalidateQueries({ queryKey: ['cards'] });
            qc.invalidateQueries({ queryKey: ['point-balance'] });
            qc.invalidateQueries({ queryKey: ['point-policies'] });
            Alert.alert('저장 완료', msg, [{ text: '확인', onPress: () => router.back() }]);
        };
        const fail = (e: any) =>
            Alert.alert('저장 실패', e?.response?.data?.message ?? '저장에 실패했습니다.');

        if (cardId) {
            update.mutate({ id: cardId, payload }, {
                onSuccess: () => done('명함이 수정되었습니다.'),
                onError: fail,
            });
            return;
        }

        // 값이 드는 경우에만 묻는다. 첫 장은 묻지 않는다.
        const go = () => create.mutate(payload, {
            onSuccess: () => done(
                cost > 0 ? `명함이 만들어지고 ${won(cost)}P가 차감되었습니다.` : '명함이 만들어졌습니다.',
            ),
            onError: fail,
        });

        if (cost > 0) {
            Alert.alert(
                `${won(cost)}P를 사용해 명함을 만들까요?`,
                `보유 ${won(balance?.balance ?? 0)}P · 만든 뒤 수정하는 것은 무료입니다.`,
                [{ text: '취소', style: 'cancel' }, { text: `${won(cost)}P 사용`, onPress: go }],
            );
        } else {
            go();
        }
    };

    const saving = create.isPending || update.isPending;

    if (cardId && isLoading) {
        return (
            <View style={s.container}>
                <Nav title="명함 수정" onBack={() => router.back()} />
                <ActivityIndicator size="small" color="#60a5fa" style={{ marginTop: 40 }} />
            </View>
        );
    }

    return (
        <View style={s.container}>
            <Nav title={cardId ? '명함 수정' : '새 명함'} onBack={() => router.back()} />

            <ScrollView
                contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 32 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* 미리보기 — 받는 사람이 볼 화면 그대로다(웹 렌더러를 띄운다) */}
                <CardPreview card={previewCard} />

                {/* 디자인 */}
                <Text style={s.sectionTitle}>디자인</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                    <View style={{ flexDirection: 'row', gap: 6, paddingVertical: 2 }}>
                        {TEMPLATES.map((t) => {
                            const on = payload.templateId === t.id;
                            return (
                                <TouchableOpacity
                                    key={t.id}
                                    style={[s.chip, on && s.chipOn]}
                                    onPress={() => set('templateId', t.id)}
                                    activeOpacity={0.85}
                                >
                                    <Text style={[s.chipText, on && s.chipTextOn]}>{t.name}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>

                <View style={s.card}>
                    <Field label="이름" value={payload.name} onChange={(v) => set('name', v)} placeholder="홍길동" />
                    <Field label="직급" value={payload.position ?? ''} onChange={(v) => set('position', v)} placeholder="분양팀장" />
                    <Field label="소속" value={payload.company ?? ''} onChange={(v) => set('company', v)} placeholder="번개분양대행" />
                    <Field label="담당 현장" value={payload.siteName ?? ''} onChange={(v) => set('siteName', v)} placeholder="래미안 원베일리" />
                    <Field label="연락처" value={payload.phone ?? ''} onChange={(v) => set('phone', v)} placeholder="010-1234-5678" keyboardType="phone-pad" />
                    <Field label="근무 지역" value={payload.region ?? ''} onChange={(v) => set('region', v)} placeholder="서울 서초구" />
                    <Field label="이메일" value={payload.email ?? ''} onChange={(v) => set('email', v)} placeholder="hong@lightby.co.kr" keyboardType="email-address" />

                    <Text style={s.fieldLabel}>한 줄 소개</Text>
                    <TextInput
                        style={[s.input, { height: 80, textAlignVertical: 'top' }]}
                        value={payload.slogan ?? ''}
                        onChangeText={(v: string) => set('slogan', v)}
                        placeholder={'현장을 가장 잘 아는 사람이 되겠습니다.'}
                        multiline
                        maxLength={200}
                    />

                    <Text style={s.fieldLabel}>강점 태그</Text>
                    <View style={s.tagRow}>
                        {payload.tags.map((t, i) => (
                            <TouchableOpacity
                                key={`${t}-${i}`}
                                style={s.tag}
                                onPress={() => set('tags', payload.tags.filter((_, j) => j !== i))}
                                activeOpacity={0.8}
                            >
                                <Text style={s.tagText}>{t}</Text>
                                <Ionicons name="close" size={12} color="#64748b" />
                            </TouchableOpacity>
                        ))}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TextInput
                            style={[s.input, { flex: 1 }]}
                            value={tagDraft}
                            onChangeText={setTagDraft}
                            placeholder="아파트, 10년 경력…"
                            maxLength={20}
                            onSubmitEditing={() => {
                                const v = tagDraft.trim();
                                if (!v || payload.tags.length >= 4) return;
                                set('tags', [...payload.tags, v]);
                                setTagDraft('');
                            }}
                        />
                    </View>
                    <Text style={s.hint}>태그를 누르면 지워집니다. 최대 4개.</Text>
                </View>

                <TouchableOpacity
                    style={[s.saveBtn, saving && { opacity: 0.6 }]}
                    onPress={save}
                    disabled={saving}
                    activeOpacity={0.85}
                >
                    <Text style={s.saveText}>
                        {saving ? '저장 중…' : cardId ? '수정 저장' : `명함 만들기${cost > 0 ? ` (${won(cost)}P)` : ''}`}
                    </Text>
                </TouchableOpacity>

                {!cardId && cost === 0 && freeLeft > 0 ? (
                    <Text style={s.note}>첫 장은 무료입니다</Text>
                ) : null}
                {cardId ? <Text style={s.note}>수정은 무료입니다</Text> : null}
            </ScrollView>
        </View>
    );
}

function Nav({ title, onBack }: { title: string; onBack: () => void }) {
    return (
        <View style={s.nav}>
            <TouchableOpacity onPress={onBack} style={s.navBack}>
                <Ionicons name="chevron-back" size={24} color="#0f172a" />
            </TouchableOpacity>
            <Text style={s.navTitle}>{title}</Text>
            <View style={s.navBack} />
        </View>
    );
}

function Field({
    label, value, onChange, placeholder, keyboardType,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    keyboardType?: 'default' | 'phone-pad' | 'email-address';
}) {
    return (
        <>
            <Text style={s.fieldLabel}>{label}</Text>
            <TextInput
                style={s.input}
                value={value}
                onChangeText={onChange}
                placeholder={placeholder}
                keyboardType={keyboardType ?? 'default'}
                maxLength={60}
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

    sectionTitle: { fontSize: 13, fontWeight: '700', color: '#475569', marginTop: 14, marginBottom: 8 },
    chip: {
        borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 999,
        paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#fff',
    },
    chipOn: { backgroundColor: '#1e293b', borderColor: '#1e293b' },
    chipText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
    chipTextOn: { color: '#fff' },

    card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginTop: 8 },
    fieldLabel: { fontSize: 12, fontWeight: '700', color: '#475569', marginTop: 12, marginBottom: 6 },
    input: {
        borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
        paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#0f172a',
        backgroundColor: '#fff',
    },
    hint: { fontSize: 11, color: '#94a3b8', marginTop: 6 },
    tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
    tag: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#f1f5f9', borderRadius: 999,
        paddingHorizontal: 10, paddingVertical: 6,
    },
    tagText: { fontSize: 12, color: '#475569' },

    saveBtn: {
        backgroundColor: '#2563eb', borderRadius: 14,
        paddingVertical: 15, marginTop: 12, alignItems: 'center',
    },
    saveText: { fontSize: 15, fontWeight: '700', color: '#fff' },
    note: { fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 8 },
});
