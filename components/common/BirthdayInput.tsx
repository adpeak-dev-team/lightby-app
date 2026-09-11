import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, type TextInput as RNTextInput } from 'react-native';
import { Text } from '@/components/common/AppText';
import { TextInput } from '@/components/common/AppTextInput';

type Parts = { y: string; m: string; d: string };

const EMPTY: Parts = { y: '', m: '', d: '' };

const split = (v: string): Parts => {
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v ?? '');
    return m ? { y: m[1], m: m[2], d: m[3] } : EMPTY;
};

/** 세 칸이 다 차야 'YYYY-MM-DD'. 아니면 빈 문자열 — 반쯤 채운 날짜를 저장하면 안 된다. */
const compose = (p: Parts): string =>
    p.y.length === 4 && p.m.length >= 1 && p.d.length >= 1
        ? `${p.y}-${p.m.padStart(2, '0')}-${p.d.padStart(2, '0')}`
        : '';

/**
 * 생년월일 입력 — 'YYYY-MM-DD'.
 *
 * 예전에는 **나이**만 받아 `올해 - 나이` 로 1월 1일을 만들어 저장했다.
 * 그때는 나이대 필터에만 쓰여서 문제가 없었는데, 사주가 들어오면서 이 값이
 * **운세 계산의 입력**이 됐다 — 전 회원이 1월 1일생으로 계산되던 셈이다.
 * (웹은 date 입력으로 먼저 바꿨다. 앱만 남아 있었다)
 *
 * ⚠️ **세 칸은 자체 상태로 들고 있는다.** 부모의 'YYYY-MM-DD' 하나만 보고 그리면,
 *    연도 첫 글자를 치는 순간 아직 완성 전이라 부모가 '' 가 되고 그 '' 가 되돌아와
 *    방금 친 글자를 지운다. (실제로 그렇게 동작했다)
 *    부모 값은 **밖에서 새로 들어올 때만** 반영한다.
 *
 * 네이티브 달력(@react-native-community/datetimepicker)을 쓰지 않는 이유:
 * 네이티브 모듈이라 앱을 다시 빌드해야 한다. 칸 셋이면 충분하고, 자릿수가 차면
 * 다음 칸으로 넘어가므로 손이 덜 간다.
 */
export function BirthdayInput({
    value,
    onChange,
}: {
    /** 'YYYY-MM-DD' 또는 '' */
    value: string;
    onChange: (v: string) => void;
}) {
    const monthRef = useRef<RNTextInput>(null);
    const dayRef = useRef<RNTextInput>(null);
    const [parts, setParts] = useState<Parts>(() => split(value));

    // 프로필이 늦게 도착하는 등 **밖에서** 값이 들어온 경우에만 맞춘다.
    // 우리가 방금 올려 보낸 값(빈 문자열 포함)에는 반응하지 않는다.
    useEffect(() => {
        if (!value) return;
        if (value === compose(parts)) return;
        setParts(split(value));
        // parts 를 의존성에 넣으면 타이핑마다 돌아 위 판단이 흔들린다
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const update = (next: Parts) => {
        setParts(next);
        onChange(compose(next));
    };

    const digits = (v: string, max: number) => v.replace(/[^0-9]/g, '').slice(0, max);

    return (
        <View>
            <View style={s.row}>
                <View style={s.cell}>
                    <TextInput
                        style={s.input}
                        value={parts.y}
                        onChangeText={(v: string) => {
                            const y = digits(v, 4);
                            update({ ...parts, y });
                            if (y.length === 4) monthRef.current?.focus();
                        }}
                        placeholder="1990"
                        placeholderTextColor="#94a3b8"
                        keyboardType="number-pad"
                        maxLength={4}
                    />
                    <Text style={s.unit}>년</Text>
                </View>
                <View style={s.cell}>
                    <TextInput
                        ref={monthRef}
                        style={s.input}
                        value={parts.m}
                        onChangeText={(v: string) => {
                            const m = digits(v, 2);
                            update({ ...parts, m });
                            if (m.length === 2) dayRef.current?.focus();
                        }}
                        onBlur={() => {
                            if (parts.m) update({ ...parts, m: parts.m.padStart(2, '0') });
                        }}
                        placeholder="03"
                        placeholderTextColor="#94a3b8"
                        keyboardType="number-pad"
                        maxLength={2}
                    />
                    <Text style={s.unit}>월</Text>
                </View>
                <View style={s.cell}>
                    <TextInput
                        ref={dayRef}
                        style={s.input}
                        value={parts.d}
                        onChangeText={(v: string) => update({ ...parts, d: digits(v, 2) })}
                        onBlur={() => {
                            if (parts.d) update({ ...parts, d: parts.d.padStart(2, '0') });
                        }}
                        placeholder="15"
                        placeholderTextColor="#94a3b8"
                        keyboardType="number-pad"
                        maxLength={2}
                    />
                    <Text style={s.unit}>일</Text>
                </View>
            </View>
            <Text style={s.hint}>오늘의 사주가 이 날짜로 계산됩니다. 정확히 입력해 주세요.</Text>
        </View>
    );
}

/**
 * 'YYYY-MM-DD' 가 실제로 존재하는 날짜인가.
 *
 * `new Date('2026-02-31')` 은 3월 3일로 굴러가 버려서 파싱만으로는 못 거른다.
 * 넣은 값과 되돌아온 값이 같은지 비교한다.
 */
export function isValidBirthday(v: string): boolean {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
    if (!m) return false;
    const [, ys, ms, ds] = m;
    const year = Number(ys), month = Number(ms), day = Number(ds);
    const dt = new Date(year, month - 1, day);
    if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) return false;
    // 미래이거나 1900년 이전이면 오타다
    return dt <= new Date() && year >= 1900;
}

const s = StyleSheet.create({
    row: { flexDirection: 'row', gap: 8 },
    cell: { flex: 1, position: 'relative', justifyContent: 'center' },
    input: {
        borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
        backgroundColor: '#fff',
        paddingLeft: 14, paddingRight: 28, paddingVertical: 11,
        fontSize: 14, color: '#0f172a',
    },
    unit: {
        position: 'absolute', right: 12,
        fontSize: 12, color: '#94a3b8',
    },
    hint: { fontSize: 11, color: '#94a3b8', marginTop: 6, lineHeight: 16 },
});
