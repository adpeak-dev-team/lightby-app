import { useRef } from 'react';
import { View, StyleSheet, type TextInput as RNTextInput } from 'react-native';
import { Text } from '@/components/common/AppText';
import { TextInput } from '@/components/common/AppTextInput';

/**
 * 생년월일 입력 — 'YYYY-MM-DD'.
 *
 * 예전에는 **나이**만 받아 `올해 - 나이` 로 1월 1일을 만들어 저장했다.
 * 그때는 나이대 필터에만 쓰여서 문제가 없었는데, 사주가 들어오면서 이 값이
 * **운세 계산의 입력**이 됐다 — 전 회원이 1월 1일생으로 계산되던 셈이다.
 * (웹은 date 입력으로 먼저 바꿨다. 앱만 남아 있었다)
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

    const [y = '', m = '', d = ''] = value ? value.split('-') : [];

    // 저장 형식은 항상 'YYYY-MM-DD' 다. 세 칸이 다 차기 전에는 빈 문자열로 둔다 —
    // 반쯤 채운 값을 서버로 보내면 조용히 이상한 날짜가 저장된다.
    const emit = (ny: string, nm: string, nd: string) => {
        if (ny.length === 4 && nm.length >= 1 && nd.length >= 1) {
            onChange(`${ny}-${nm.padStart(2, '0')}-${nd.padStart(2, '0')}`);
        } else {
            onChange('');
        }
    };

    const digits = (v: string, max: number) => v.replace(/[^0-9]/g, '').slice(0, max);

    return (
        <View>
            <View style={s.row}>
                <View style={s.cell}>
                    <TextInput
                        style={s.input}
                        value={y}
                        onChangeText={(v: string) => {
                            const n = digits(v, 4);
                            emit(n, m, d);
                            if (n.length === 4) monthRef.current?.focus();
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
                        value={m}
                        onChangeText={(v: string) => {
                            const n = digits(v, 2);
                            emit(y, n, d);
                            if (n.length === 2) dayRef.current?.focus();
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
                        value={d}
                        onChangeText={(v: string) => emit(y, m, digits(v, 2))}
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
 * `new Date('2026-02-31')` 은 3월 3일로 굴러가 버려서 그냥 파싱만으로는 못 거른다.
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
    const now = new Date();
    return dt <= now && year >= 1900;
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
