import { useState, type ReactNode } from 'react';
import {
    View, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Alert,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { TextInput } from '@/components/common/AppTextInput';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

import type { CardPayload } from '@/services/card/types';

/**
 * 명함 입력 폼 — 웹 `CardForm.tsx` 와 **같은 칸, 같은 순서**다.
 *
 * 사진 · 이름/직급 · 소속 · 담당 현장 · 연락처/지역 · 이메일 · 소개 · 태그.
 * 앱과 웹에서 칸 구성이 다르면 한쪽에서 만든 명함이 다른 쪽에서 이상해 보이고,
 * "앱에서는 그 칸이 없더라" 는 문의가 계속 들어온다.
 *
 * ⚠️ 입력 중에는 **아무것도 다듬지 않는다.** 매 글자마다 trim 하면 방금 친 스페이스가
 *    그 순간 "맨 끝 공백"이라 즉시 잘려 띄어쓰기가 안 된다. 정규화는 저장 한 번뿐이다.
 */
export function CardForm({
    value,
    onChange,
    photoUrl,
    onPhotoPicked,
    uploading,
}: {
    value: CardPayload;
    onChange: <K extends keyof CardPayload>(key: K, v: CardPayload[K]) => void;
    /** 화면에 띄울 사진 주소(업로드 직후에는 서버 왕복 없이 이 값을 쓴다) */
    photoUrl: string | null;
    /** 고른 사진을 올리고 끝난 뒤를 호출부가 처리한다. null 이면 삭제 */
    onPhotoPicked: (asset: { uri: string; name: string; type: string } | null) => void;
    uploading: boolean;
}) {
    const [tagDraft, setTagDraft] = useState('');

    const pickPhoto = async () => {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
            Alert.alert('권한 필요', '사진 라이브러리 접근 권한이 필요합니다.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 1,
            allowsEditing: true,
            // 증명사진은 정사각, 상반신은 세로 3:4 — 명함에 들어가는 틀과 맞춰 자르게 한다.
            aspect: value.photoStyle === 'bust' ? [3, 4] : [1, 1],
        });
        if (result.canceled || !result.assets?.[0]) return;

        try {
            // 원본 그대로 올리면 요즘 폰 사진은 한 장에 5MB 가 넘는다.
            const out = await ImageManipulator.manipulateAsync(
                result.assets[0].uri,
                [{ resize: { width: 800 } }],
                { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
            );
            onPhotoPicked({
                uri: out.uri,
                name: out.uri.split('/').pop() ?? 'card-photo.jpg',
                type: 'image/jpeg',
            });
        } catch {
            Alert.alert('오류', '사진을 준비하지 못했습니다.');
        }
    };

    const addTag = () => {
        const t = tagDraft.trim();
        if (!t || value.tags.includes(t) || value.tags.length >= 4) {
            setTagDraft('');
            return;
        }
        onChange('tags', [...value.tags, t]);
        setTagDraft('');
    };

    return (
        <View style={{ gap: 16 }}>
            {/* 사진 */}
            <View>
                <Label text="프로필 사진" hint="선택" />
                <View style={s.photoRow}>
                    <TouchableOpacity style={s.photoBox} onPress={pickPhoto} activeOpacity={0.8}>
                        {uploading ? (
                            <ActivityIndicator size="small" color="#60a5fa" />
                        ) : photoUrl ? (
                            <Image source={{ uri: photoUrl }} style={s.photo} />
                        ) : (
                            <Ionicons name="image-outline" size={22} color="#94a3b8" />
                        )}
                    </TouchableOpacity>

                    <View style={{ flex: 1 }}>
                        <Text style={s.photoDesc}>정면 얼굴 사진을 권합니다.</Text>
                        <Text style={s.photoHint}>
                            명함에만 쓰이며, 회원 프로필 사진과는 별개입니다.
                        </Text>
                        {photoUrl && (
                            <TouchableOpacity
                                onPress={() => onPhotoPicked(null)}
                                style={s.photoDel}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="trash-outline" size={12} color="#ef4444" />
                                <Text style={s.photoDelText}>사진 삭제</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* 증명사진(정사각) / 상반신(세로 3:4) */}
                <Text style={s.subLabel}>사진 스타일</Text>
                <View style={s.segment}>
                    {([
                        { id: 'id', label: '증명사진' },
                        { id: 'bust', label: '상반신' },
                    ] as const).map((opt) => {
                        const on = value.photoStyle === opt.id;
                        return (
                            <TouchableOpacity
                                key={opt.id}
                                style={[s.segmentBtn, on && s.segmentBtnOn]}
                                onPress={() => onChange('photoStyle', opt.id)}
                                activeOpacity={0.8}
                            >
                                <Text style={[s.segmentText, on && s.segmentTextOn]}>{opt.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            <View style={s.row2}>
                <Field
                    style={{ flex: 1 }}
                    label="이름"
                    value={value.name}
                    onChange={(v) => onChange('name', v)}
                    placeholder="홍길동"
                    maxLength={20}
                />
                <Field
                    style={{ flex: 1 }}
                    label="직급"
                    value={value.position ?? ''}
                    onChange={(v) => onChange('position', v)}
                    placeholder="분양팀장"
                    maxLength={20}
                />
            </View>

            <Field
                label="소속"
                hint="대행사 · 회사명"
                value={value.company ?? ''}
                onChange={(v) => onChange('company', v)}
                placeholder="번개분양대행"
                maxLength={30}
            />

            <Field
                label="담당 현장"
                hint="현장이 바뀌면 이것만 고치면 됩니다"
                value={value.siteName ?? ''}
                onChange={(v) => onChange('siteName', v)}
                placeholder="래미안 원베일리"
                maxLength={30}
            />

            <View style={s.row2}>
                <Field
                    style={{ flex: 1 }}
                    label="연락처"
                    value={value.phone ?? ''}
                    onChange={(v) => onChange('phone', v)}
                    placeholder="010-1234-5678"
                    keyboardType="phone-pad"
                    maxLength={20}
                />
                <Field
                    style={{ flex: 1 }}
                    label="지역"
                    value={value.region ?? ''}
                    onChange={(v) => onChange('region', v)}
                    placeholder="서울 서초구"
                    maxLength={20}
                />
            </View>

            <Field
                label="이메일"
                hint="선택"
                value={value.email ?? ''}
                onChange={(v) => onChange('email', v)}
                placeholder="hong@lightby.co.kr"
                keyboardType="email-address"
                maxLength={40}
            />

            {/* 소개는 프로필에서 끌어온 글이 길 수 있어 통째로 비우는 버튼을 둔다 */}
            <View>
                <Label
                    text="소개"
                    hint="여러 줄 가능 · 선택"
                    action={value.slogan ? (
                        <TouchableOpacity onPress={() => onChange('slogan', '')} hitSlop={8}>
                            <Text style={s.clearText}>지우기</Text>
                        </TouchableOpacity>
                    ) : undefined}
                />
                <TextInput
                    style={[s.input, s.textarea]}
                    value={value.slogan ?? ''}
                    onChangeText={(v: string) => onChange('slogan', v)}
                    placeholder={'현장을 가장 잘 아는 사람이 되겠습니다.\n언제든 편하게 연락 주세요.'}
                    placeholderTextColor="#94a3b8"
                    multiline
                    maxLength={200}
                />
            </View>

            {/* 태그 */}
            <View>
                <Label text="강점 태그" hint="최대 4개" />
                {value.tags.length > 0 && (
                    <View style={s.tagRow}>
                        {value.tags.map((t) => (
                            <View key={t} style={s.tag}>
                                <Text style={s.tagText}>{t}</Text>
                                <TouchableOpacity
                                    onPress={() => onChange('tags', value.tags.filter((x) => x !== t))}
                                    hitSlop={6}
                                >
                                    <Ionicons name="close" size={13} color="#2563eb" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}
                <View style={s.tagInputRow}>
                    <TextInput
                        style={[s.input, { flex: 1 }]}
                        value={tagDraft}
                        onChangeText={setTagDraft}
                        placeholder="아파트, 오피스텔, 10년 경력…"
                        placeholderTextColor="#94a3b8"
                        maxLength={12}
                        editable={value.tags.length < 4}
                        onSubmitEditing={addTag}
                        returnKeyType="done"
                    />
                    <TouchableOpacity
                        style={[s.addBtn, value.tags.length >= 4 && { opacity: 0.4 }]}
                        onPress={addTag}
                        disabled={value.tags.length >= 4}
                        activeOpacity={0.85}
                    >
                        <Text style={s.addText}>추가</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

function Label({ text, hint, action }: { text: string; hint?: string; action?: ReactNode }) {
    return (
        <View style={s.labelRow}>
            <Text style={s.label}>
                {text}
                {hint ? <Text style={s.labelHint}>  {hint}</Text> : null}
            </Text>
            {action}
        </View>
    );
}

function Field({
    label, hint, value, onChange, placeholder, keyboardType, maxLength, style,
}: {
    label: string;
    hint?: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    keyboardType?: 'default' | 'phone-pad' | 'email-address';
    maxLength?: number;
    style?: object;
}) {
    return (
        <View style={style}>
            <Label text={label} hint={hint} />
            <TextInput
                style={s.input}
                value={value}
                onChangeText={onChange}
                placeholder={placeholder}
                placeholderTextColor="#94a3b8"
                keyboardType={keyboardType ?? 'default'}
                maxLength={maxLength}
            />
        </View>
    );
}

const s = StyleSheet.create({
    labelRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        gap: 8, marginBottom: 6,
    },
    label: { fontSize: 12, fontWeight: '700', color: '#475569' },
    labelHint: { fontSize: 12, fontWeight: '400', color: '#94a3b8' },
    subLabel: { fontSize: 11, color: '#64748b', marginTop: 14, marginBottom: 6 },
    clearText: { fontSize: 11, fontWeight: '700', color: '#94a3b8' },

    input: {
        borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
        backgroundColor: '#fff',
        paddingHorizontal: 14, paddingVertical: 11,
        fontSize: 14, color: '#0f172a',
    },
    textarea: { height: 96, textAlignVertical: 'top', paddingTop: 11 },
    row2: { flexDirection: 'row', gap: 12 },

    photoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    photoBox: {
        width: 64, height: 64, borderRadius: 16,
        borderWidth: 2, borderColor: '#cbd5e1', borderStyle: 'dashed',
        backgroundColor: '#f8fafc',
        alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    },
    photo: { width: '100%', height: '100%' },
    photoDesc: { fontSize: 12, color: '#64748b' },
    photoHint: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
    photoDel: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 5 },
    photoDelText: { fontSize: 11, fontWeight: '600', color: '#ef4444' },

    segment: {
        flexDirection: 'row', alignSelf: 'flex-start',
        backgroundColor: '#f1f5f9', borderRadius: 10, padding: 2,
    },
    segmentBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
    segmentBtnOn: { backgroundColor: '#fff' },
    segmentText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
    segmentTextOn: { color: '#2563eb' },

    tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
    tag: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#eff6ff', borderRadius: 999,
        paddingLeft: 10, paddingRight: 7, paddingVertical: 5,
    },
    tagText: { fontSize: 12, color: '#2563eb', fontWeight: '600' },
    tagInputRow: { flexDirection: 'row', gap: 8 },
    addBtn: {
        backgroundColor: '#0f172a', borderRadius: 12,
        paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center',
    },
    addText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
