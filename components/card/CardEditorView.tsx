import { useEffect, useMemo, useState } from 'react';
import {
    View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { TextInput } from '@/components/common/AppTextInput';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IMAGE_PREFIX } from '@/lib/constants';
import { CardPreview } from '@/components/card/CardPreview';
import { CardForm } from '@/components/card/CardForm';
import { TEMPLATES } from '@/components/card/templates';
import { uploadCardPhoto } from '@/services/card/api';
import {
    useCard, useCreateCard, useDeleteCard, useUpdateCard,
} from '@/services/card/queries';
import { usePointBalance, usePointPolicies } from '@/services/point/queries';
import { useGetUserProfile } from '@/services/user/queries';
import type { CardPayload } from '@/services/card/types';

const won = (n: number) => n.toLocaleString('ko-KR');

const imageUrl = (path: string | null) =>
    !path ? null : path.startsWith('http') ? path : `${IMAGE_PREFIX}${path}`;

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

/**
 * 저장 직전에만 쓴다. 공백뿐이면 null, 아니면 앞뒤 공백을 턴 값.
 *
 * ⚠️ **입력 중에는 절대 부르지 말 것.** 매 글자마다 trim 하면 방금 친 스페이스가
 *    그 순간 "맨 끝 공백"이라 즉시 잘려 띄어쓰기가 아예 안 된다.
 */
const emptyToNull = (v: string | null | undefined) => {
    const t = (v ?? '').trim();
    return t ? t : null;
};

/**
 * 명함 만들기 / 수정.
 *
 * 구성은 웹 `CardEditor` 와 같다 — 미리보기 · 디자인 · 명함 내용 · 삭제 · 저장 바.
 * 미리보기는 **웹 렌더러를 WebView 로 띄운다**(받는 사람이 보는 화면 그대로).
 *
 * 사진은 **고르는 즉시 서버에 올린다.** 저장 때 몰아 올리면 저장 실패와 업로드 실패가
 * 섞여서 사용자가 무엇을 다시 해야 하는지 알 수 없다.
 */
export function CardEditorView({ cardId }: { cardId: number | null }) {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const qc = useQueryClient();

    const { data: existing, isLoading } = useCard(cardId);
    const { data: profile } = useGetUserProfile();
    const { data: balance } = usePointBalance();
    const { data: policies } = usePointPolicies();
    const create = useCreateCard();
    const update = useUpdateCard();
    const remove = useDeleteCard();

    const [payload, setPayload] = useState<CardPayload>(SAMPLE);
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [prefilled, setPrefilled] = useState(false);

    // 수정이면 서버 값으로 시작한다.
    useEffect(() => {
        if (!existing) return;
        setPayload({ ...existing });
        setPhotoUrl(imageUrl(existing.photoPath));
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
    const saving = create.isPending || update.isPending;

    // 미리보기로 보낼 값. 사진은 서버 경로라 WebView 쪽에서 절대 주소로 만든다.
    const previewCard = useMemo(() => payload, [payload]);

    const onPhotoPicked = async (
        asset: { uri: string; name: string; type: string } | null,
    ) => {
        if (!asset) {
            set('photoPath', null);
            setPhotoUrl(null);
            return;
        }
        setUploading(true);
        try {
            const path = await uploadCardPhoto(asset);
            set('photoPath', path);
            setPhotoUrl(imageUrl(path));
        } catch (e: any) {
            // 무엇이 실패했는지 화면에 남긴다. 이유 없이 "실패" 만 뜨면 사용자도 우리도
            // 다시 시도하는 것 말고 할 수 있는 게 없다.
            const status = e?.response?.status;
            const msg = e?.response?.data?.message ?? e?.message ?? '다시 시도해 주세요.';
            console.warn('[card] 사진 업로드 실패', status, e?.response?.data ?? e);
            Alert.alert('사진 업로드 실패', status ? `${msg} (${status})` : msg);
        } finally {
            setUploading(false);
        }
    };

    const save = () => {
        if (!payload.name?.trim()) {
            Alert.alert('이름을 입력해 주세요.');
            return;
        }

        // 편집 중에는 사용자가 친 그대로 들고 있었으므로 여기서 한 번만 다듬는다.
        // 관리용 제목이 없으면 현장명으로 대신한다 — 목록에서 구분이 안 되면 여러 장이 의미가 없다.
        const body: CardPayload = {
            ...payload,
            name: payload.name.trim(),
            title: emptyToNull(payload.title) ?? emptyToNull(payload.siteName),
            position: emptyToNull(payload.position),
            company: emptyToNull(payload.company),
            siteName: emptyToNull(payload.siteName),
            phone: emptyToNull(payload.phone),
            email: emptyToNull(payload.email),
            region: emptyToNull(payload.region),
            slogan: emptyToNull(payload.slogan),
        };

        const done = (msg: string) => {
            qc.invalidateQueries({ queryKey: ['cards'] });
            qc.invalidateQueries({ queryKey: ['point-balance'] });
            qc.invalidateQueries({ queryKey: ['point-policies'] });
            Alert.alert('저장 완료', msg, [{ text: '확인', onPress: () => router.replace('/card') }]);
        };
        const fail = (e: any) =>
            Alert.alert('저장 실패', e?.response?.data?.message ?? '저장에 실패했습니다.');

        if (cardId) {
            update.mutate({ id: cardId, payload: body }, {
                onSuccess: () => done('명함이 수정되었습니다.'),
                onError: fail,
            });
            return;
        }

        const go = () => create.mutate(body, {
            onSuccess: () => done(
                cost > 0 ? `명함이 만들어지고 ${won(cost)}P가 차감되었습니다.` : '명함이 만들어졌습니다.',
            ),
            onError: fail,
        });

        // 값이 드는 경우에만 묻는다. 첫 장은 묻지 않는다.
        if (cost > 0) {
            const now = balance?.balance ?? 0;
            if (now < cost) {
                Alert.alert(
                    `포인트가 ${won(cost - now)}P 부족합니다`,
                    `명함 제작에 ${won(cost)}P가 필요합니다.\n지금 ${won(now)}P 있어요.`,
                    [
                        { text: '닫기', style: 'cancel' },
                        { text: '내 포인트', onPress: () => router.push('/mypage/point' as never) },
                    ],
                );
                return;
            }
            Alert.alert(
                `${won(cost)}P를 사용해 명함을 만들까요?`,
                `보유 ${won(now)}P · 만든 뒤 수정하는 것은 무료입니다.`,
                [{ text: '취소', style: 'cancel' }, { text: `${won(cost)}P 사용`, onPress: go }],
            );
            return;
        }
        go();
    };

    /**
     * 명함 삭제.
     *
     * 목록이 아니라 **여기**에 둔다. 이미 뿌린 링크가 전부 "삭제된 명함입니다" 로
     * 바뀌는 동작이라, 목록에서 작은 휴지통 아이콘 하나로 날아가면 안 된다.
     */
    const onDelete = () => {
        if (!cardId) return;
        Alert.alert(
            '이 명함을 삭제할까요?',
            '이미 보낸 링크는 "삭제된 명함입니다" 안내가 뜹니다. 되돌릴 수 없습니다.',
            [
                { text: '취소', style: 'cancel' },
                {
                    text: '삭제',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await remove.mutateAsync(cardId);
                            router.replace('/card');
                        } catch (e: any) {
                            Alert.alert('삭제 실패', e?.response?.data?.message ?? '삭제에 실패했습니다.');
                        }
                    },
                },
            ],
        );
    };

    const title = cardId ? '명함 수정' : '새 명함';

    if (cardId && isLoading) {
        return (
            <View style={s.container}>
                <Nav title={title} onBack={() => router.back()} />
                <ActivityIndicator size="small" color="#60a5fa" style={{ marginTop: 40 }} />
            </View>
        );
    }

    return (
        <View style={s.container}>
            <Nav title={title} onBack={() => router.back()} />

            <ScrollView
                contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* 미리보기 — 받는 사람이 볼 화면 그대로다(웹 렌더러를 띄운다) */}
                <CardPreview card={previewCard} />

                {/* 디자인 */}
                <View style={s.sectionHead}>
                    <Text style={s.sectionTitle}>디자인</Text>
                    <Text style={s.sectionCount}>{TEMPLATES.length}종</Text>
                </View>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.rail}
                >
                    {TEMPLATES.map((t) => {
                        const on = payload.templateId === t.id;
                        return (
                            <TouchableOpacity
                                key={t.id}
                                style={s.tplItem}
                                onPress={() => set('templateId', t.id)}
                                activeOpacity={0.85}
                            >
                                <LinearGradient
                                    colors={t.colors}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={[s.tplSwatch, on && s.tplSwatchOn]}
                                />
                                <Text style={[s.tplName, on && s.tplNameOn]} numberOfLines={1}>
                                    {t.name}
                                </Text>
                                <Text style={s.tplHint} numberOfLines={1}>{t.hint}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* 내용 */}
                <View style={s.card}>
                    <Text style={[s.sectionTitle, { marginBottom: 12 }]}>명함 내용</Text>

                    <View style={{ marginBottom: 16 }}>
                        <View style={s.labelRow}>
                            <Text style={s.label}>
                                관리용 제목
                                <Text style={s.labelHint}>  선택 · 내 목록에서만 보입니다</Text>
                            </Text>
                        </View>
                        <TextInput
                            style={s.input}
                            value={payload.title ?? ''}
                            onChangeText={(v: string) => set('title', v)}
                            placeholder="비우면 현장명으로 표시됩니다"
                            placeholderTextColor="#94a3b8"
                            maxLength={50}
                        />
                    </View>

                    <CardForm
                        value={payload}
                        onChange={set}
                        photoUrl={photoUrl}
                        onPhotoPicked={onPhotoPicked}
                        uploading={uploading}
                    />
                </View>

                {cardId ? (
                    <TouchableOpacity
                        style={[s.deleteBtn, remove.isPending && { opacity: 0.6 }]}
                        onPress={onDelete}
                        disabled={remove.isPending}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="trash-outline" size={15} color="#dc2626" />
                        <Text style={s.deleteText}>
                            {remove.isPending ? '삭제 중…' : '이 명함 삭제'}
                        </Text>
                    </TouchableOpacity>
                ) : null}

                {!cardId && cost === 0 && freeLeft > 0 ? (
                    <Text style={s.note}>첫 장은 무료입니다</Text>
                ) : null}
                {cardId ? <Text style={s.note}>수정은 무료입니다</Text> : null}
            </ScrollView>

            {/* 저장 바 — 미리보기를 보면서 저장할 수 있게 하단에 고정한다(웹 동일) */}
            <View style={[s.saveBar, { paddingBottom: insets.bottom + 12 }]}>
                <TouchableOpacity style={s.cancelBtn} onPress={() => router.back()} activeOpacity={0.8}>
                    <Text style={s.cancelText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[s.saveBtn, (saving || uploading) && { opacity: 0.6 }]}
                    onPress={save}
                    disabled={saving || uploading}
                    activeOpacity={0.85}
                >
                    <Ionicons
                        name={saving ? 'ellipsis-horizontal' : cardId ? 'checkmark' : 'share-social-outline'}
                        size={16}
                        color="#fff"
                    />
                    <Text style={s.saveText}>
                        {saving ? '저장 중…'
                            : cardId ? '수정 완료'
                                : `명함 만들기${cost > 0 ? ` (${won(cost)}P)` : ''}`}
                    </Text>
                </TouchableOpacity>
            </View>
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

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f1f5f9' },
    nav: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#fff', paddingTop: 10, paddingBottom: 12, paddingHorizontal: 16,
        borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
    },
    navBack: { width: 40, alignItems: 'flex-start' },
    navTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },

    sectionHead: {
        flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
        marginTop: 24, marginBottom: 10,
    },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
    sectionCount: { fontSize: 12, color: '#94a3b8' },

    rail: { gap: 10, paddingVertical: 2, paddingRight: 16 },
    tplItem: { width: 76 },
    tplSwatch: {
        width: 76, height: 106, borderRadius: 12,
        borderWidth: 2, borderColor: 'transparent',
    },
    tplSwatchOn: { borderColor: '#3b82f6' },
    tplName: { fontSize: 11, fontWeight: '700', color: '#475569', marginTop: 6 },
    tplNameOn: { color: '#2563eb' },
    tplHint: { fontSize: 10, color: '#94a3b8', marginTop: 1 },

    card: {
        backgroundColor: '#fff', borderRadius: 16,
        borderWidth: 1, borderColor: '#e2e8f0',
        padding: 16, marginTop: 24,
    },
    labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    label: { fontSize: 12, fontWeight: '700', color: '#475569' },
    labelHint: { fontSize: 12, fontWeight: '400', color: '#94a3b8' },
    input: {
        borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
        backgroundColor: '#fff',
        paddingHorizontal: 14, paddingVertical: 11,
        fontSize: 14, color: '#0f172a',
    },

    deleteBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        backgroundColor: '#fff', borderRadius: 14,
        borderWidth: 1, borderColor: '#fecaca',
        paddingVertical: 14, marginTop: 16,
    },
    deleteText: { fontSize: 14, fontWeight: '700', color: '#dc2626' },
    note: { fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 10 },

    saveBar: {
        flexDirection: 'row', gap: 8,
        backgroundColor: '#fff',
        borderTopWidth: 1, borderTopColor: '#e2e8f0',
        paddingHorizontal: 16, paddingTop: 12,
    },
    cancelBtn: {
        backgroundColor: '#f1f5f9', borderRadius: 12,
        paddingHorizontal: 22, paddingVertical: 14,
    },
    cancelText: { fontSize: 14, fontWeight: '600', color: '#475569' },
    saveBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 14,
    },
    saveText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
