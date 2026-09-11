import { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';
import { TextInput } from '@/components/common/AppTextInput';
import { Ionicons } from '@expo/vector-icons';

import { useSajuRegions } from '@/services/saju/queries';
import type { CalendarType, SajuProfileInput } from '@/services/saju/types';

/** 'HH:MM' 을 시/분으로 나눠 다루기 위한 도우미 */
const splitTime = (v: string | null) => {
    const m = /^(\d{1,2}):(\d{2})/.exec(v ?? '');
    return { hour: m ? Number(m[1]) : 12, minute: m ? Number(m[2]) : 0 };
};
const joinTime = (hour: number, minute: number) =>
    `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

const clamp = (v: string, max: number) => {
    const n = Number(v.replace(/[^0-9]/g, ''));
    if (Number.isNaN(n)) return 0;
    return Math.min(Math.max(n, 0), max);
};

/**
 * 출생 정보 입력 — **회원 정보에 없는 것만** 받는다.
 *
 * 이름·성별·생년월일은 회원 정보에서 온다. 여기서 다시 받지 않는다
 * (두 곳에 같은 값을 두면 반드시 어긋난다).
 * 이 화면이 채우는 것은 양력/음력 · 윤달 · 태어난 시각 · 출생 지역 넷뿐이다.
 *
 * 웹 SajuForm 과 같은 항목·같은 순서다.
 */
export function SajuForm({
    value,
    onChange,
    onSubmit,
    submitting = false,
    submitLabel = '이 정보로 저장',
}: {
    value: SajuProfileInput;
    onChange: (next: SajuProfileInput) => void;
    onSubmit: () => void;
    submitting?: boolean;
    submitLabel?: string;
}) {
    const { data: regions } = useSajuRegions();

    const set = <K extends keyof SajuProfileInput>(key: K, v: SajuProfileInput[K]) =>
        onChange({ ...value, [key]: v });

    const time = splitTime(value.birthTime);
    const list = regions ?? [{ name: '서울', longitude: 126.978 }];

    return (
        <View style={{ gap: 18 }}>
            {/* 양력 / 음력 */}
            <View>
                <Label text="양력 / 음력" hint="회원 정보의 생년월일을 어느 역법으로 볼지" />
                <View style={s.segment}>
                    {([
                        { id: 'solar' as CalendarType, label: '양력' },
                        { id: 'lunar' as CalendarType, label: '음력' },
                    ]).map((o) => {
                        const on = value.calendarType === o.id;
                        return (
                            <TouchableOpacity
                                key={o.id}
                                style={[s.segmentBtn, on && s.segmentBtnOn]}
                                onPress={() => set('calendarType', o.id)}
                                activeOpacity={0.8}
                            >
                                <Text style={[s.segmentText, on && s.segmentTextOn]}>{o.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {value.calendarType === 'lunar' && (
                    <Check
                        checked={value.isLeapMonth}
                        onToggle={() => set('isLeapMonth', !value.isLeapMonth)}
                        label="윤달입니다"
                    />
                )}
            </View>

            {/* 태어난 시각 */}
            <View>
                <Label text="태어난 시각" hint="모르면 시주 없이 3주로 봅니다" />
                <Check
                    checked={value.timeUnknown}
                    onToggle={() => {
                        const next = !value.timeUnknown;
                        onChange({
                            ...value,
                            timeUnknown: next,
                            birthTime: next ? null : joinTime(time.hour, time.minute),
                        });
                    }}
                    label="태어난 시각을 모릅니다"
                />

                {!value.timeUnknown && (
                    <View style={s.timeRow}>
                        <NumberCell
                            label="시"
                            max={23}
                            value={time.hour}
                            onChange={(h) => set('birthTime', joinTime(h, time.minute))}
                        />
                        <NumberCell
                            label="분"
                            max={59}
                            value={time.minute}
                            onChange={(m) => set('birthTime', joinTime(time.hour, m))}
                        />
                    </View>
                )}
            </View>

            {/* 태어난 지역 — 시각을 모르면 쓸 데가 없다(진태양시 보정은 시주에만 쓴다) */}
            {!value.timeUnknown && (
                <View>
                    <Label text="태어난 지역" hint="진태양시 보정에 씁니다" />
                    <View style={s.chips}>
                        {list.map((r) => {
                            const on = (value.birthRegion ?? '서울') === r.name;
                            return (
                                <TouchableOpacity
                                    key={r.name}
                                    style={[s.chip, on && s.chipOn]}
                                    onPress={() => set('birthRegion', r.name)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[s.chipText, on && s.chipTextOn]}>{r.name}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                    <Text style={s.note}>
                        한국 표준시(동경 135°)와 실제 경도 차이 · 서머타임을 반영해 시주를 정합니다.
                        보정을 빼면 매 홀수시 전후 32분에 태어난 분의 시주가 한 칸 밀립니다.
                    </Text>
                </View>
            )}

            <TouchableOpacity
                style={[s.saveBtn, submitting && { opacity: 0.6 }]}
                onPress={onSubmit}
                disabled={submitting}
                activeOpacity={0.85}
            >
                <Text style={s.saveText}>{submitting ? '저장 중…' : submitLabel}</Text>
            </TouchableOpacity>
        </View>
    );
}

/**
 * 두 자리 숫자 칸.
 *
 * ⚠️ 화면에 그리는 문자열을 **자체 상태로 들고 있는다.** 부모 값(항상 두 자리로
 *    맞춰진 숫자)만 보고 그리면, 한 자리를 친 순간 '01' 로 되돌아오고 maxLength=2 에
 *    걸려 두 번째 숫자를 아예 못 친다. (실제로 그렇게 동작했다)
 *    범위 보정은 입력할 때 값으로만 하고, 표시는 칸을 떠날 때 정리한다.
 */
function NumberCell({
    label, max, value, onChange,
}: {
    label: string;
    max: number;
    value: number;
    onChange: (v: number) => void;
}) {
    const [text, setText] = useState(String(value).padStart(2, '0'));

    // 밖에서 값이 바뀐 경우(시각 모름 해제 등)에만 맞춘다
    useEffect(() => {
        if (clamp(text, max) !== value) setText(String(value).padStart(2, '0'));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    return (
        <View style={s.timeCell}>
            <TextInput
                style={s.input}
                value={text}
                onChangeText={(v: string) => {
                    const t = v.replace(/[^0-9]/g, '').slice(0, 2);
                    setText(t);
                    onChange(clamp(t, max));
                }}
                onBlur={() => setText(String(clamp(text, max)).padStart(2, '0'))}
                keyboardType="number-pad"
                maxLength={2}
                selectTextOnFocus
            />
            <Text style={s.unit}>{label}</Text>
        </View>
    );
}

function Label({ text, hint }: { text: string; hint?: string }) {
    return (
        <Text style={s.label}>
            {text}
            {hint ? <Text style={s.labelHint}>  {hint}</Text> : null}
        </Text>
    );
}

function Check({
    checked, onToggle, label,
}: {
    checked: boolean;
    onToggle: () => void;
    label: string;
}) {
    return (
        <TouchableOpacity style={s.check} onPress={onToggle} activeOpacity={0.7}>
            <View style={[s.checkBox, checked && s.checkBoxOn]}>
                {checked && <Ionicons name="checkmark" size={13} color="#fff" />}
            </View>
            <Text style={s.checkLabel}>{label}</Text>
        </TouchableOpacity>
    );
}

const s = StyleSheet.create({
    label: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 8 },
    labelHint: { fontSize: 12, fontWeight: '400', color: '#94a3b8' },

    segment: {
        flexDirection: 'row', backgroundColor: '#f1f5f9',
        borderRadius: 12, padding: 3,
    },
    segmentBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
    segmentBtnOn: { backgroundColor: '#fff' },
    segmentText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
    segmentTextOn: { color: '#2563eb' },

    check: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
    checkBox: {
        width: 19, height: 19, borderRadius: 6,
        borderWidth: 1.5, borderColor: '#cbd5e1',
        alignItems: 'center', justifyContent: 'center',
    },
    checkBoxOn: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    checkLabel: { fontSize: 13, color: '#475569' },

    timeRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
    timeCell: { flex: 1, position: 'relative', justifyContent: 'center' },
    input: {
        borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
        backgroundColor: '#fff',
        paddingLeft: 14, paddingRight: 28, paddingVertical: 11,
        fontSize: 14, color: '#0f172a',
    },
    unit: { position: 'absolute', right: 12, fontSize: 12, color: '#94a3b8' },

    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: {
        backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
        borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7,
    },
    chipOn: { backgroundColor: '#eff6ff', borderColor: '#93c5fd' },
    chipText: { fontSize: 12, color: '#64748b' },
    chipTextOn: { color: '#2563eb', fontWeight: '700' },

    note: { fontSize: 11, color: '#94a3b8', marginTop: 8, lineHeight: 16 },

    saveBtn: {
        backgroundColor: '#2563eb', borderRadius: 12,
        paddingVertical: 14, alignItems: 'center',
    },
    saveText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
