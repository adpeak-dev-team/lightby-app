import { useState } from 'react';
import {
  View, StyleSheet, TextInput,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';

// ─── 상수 ─────────────────────────────────────────────────────────────────────

export const REGIONS = [
    '전국', '서울', '경기남부',
    '경기북부', '인천', '부산',
    '울산', '대구', '경상도',
    '대전', '세종', '충청도',
    '광주', '전라도', '강원도',
    '제주도',
];

export const INDUSTRIES = [
    '아파트', '오피스텔', '도시형생활주택',
    '호텔', '레지던스', '상가/쇼핑몰',
    '오피스', '지식산업센터', '토지',
    '빌라', '타운하우스', '펜션/풀빌라',
    '전원주택', '기타',
];

export const JOB_TYPES = [
    '시행/대행 사무직', '분양대행사', '본부장',
    '팀장', '직원', '데스크',
    'TM상담사', '알바',
];

export const FEE_TYPES = ['계약 수수료', '기본급', '기본급 + 수수료', '시급', '일급', '주급', '월급'];

// 수수료 형태에 따른 표시 조건 (front WorkPayInfo와 동일)
export const shouldShowFee = (feeType: string) => feeType === '계약 수수료' || feeType === '기본급 + 수수료';
export const shouldShowBaseSalary = (feeType: string) => feeType !== '계약 수수료' && !!feeType;
export const baseSalaryLabelFor = (feeType: string) => (feeType === '기본급 + 수수료' ? '기본급' : (feeType || '기본 급여'));

// 직종분류 하위 옵션 (front 기준)
export const GENDER_OPTIONS = ['무관', '남자', '여자'];
export const AGE_OPTIONS = ['무관', '40세 미만', '50세 미만', '60세 미만'];
export const CAREER_OPTIONS = ['경력무관', '1개월 이상', '3개월 이상', '6개월 이상', '12개월 이상', '24개월 이상'];
export const HEADCOUNT_OPTIONS = ['0명', '00명', '1명', '2명', '3명', '4명', '5명 이상'];
const MEAL_OPTIONS = ['미제공', '조식', '중식', '석식', '간식'];

// ─── 공용 UI 컴포넌트 ──────────────────────────────────────────────────────────

// 웹 SectionTitle과 동일: 파란 세로 막대 없이 제목 + 파란 필수 표시(*)만.
export function SectionHeader({ title, sub, required }: { title: string; sub?: string; required?: boolean }) {
    return (
        <View style={ss.sectionHeaderRow}>
            <Text style={ss.sectionTitle}>
                {title}
                {required ? <Text style={ss.required}> *</Text> : null}
            </Text>
            {sub ? <Text style={ss.sectionSub}>{sub}</Text> : null}
        </View>
    );
}

export function Label({ text, required }: { text: string; required?: boolean }) {
    return (
        <Text style={ss.label}>
            {text}
            {required ? <Text style={ss.required}> *</Text> : null}
        </Text>
    );
}

export function ChipButton({
    label, active, onPress, activeChipStyle, activeTextStyle, extraChipStyle,
}: {
    label: string;
    active: boolean;
    onPress: () => void;
    activeChipStyle?: object;
    activeTextStyle?: object;
    extraChipStyle?: object;
}) {
    const tap = Gesture.Tap().onEnd(() => {
        'worklet';
        scheduleOnRN(onPress);
    });
    return (
        <GestureDetector gesture={tap}>
            <View style={[ss.chip, extraChipStyle, active && activeChipStyle]}>
                <Text style={[ss.chipText, active && activeTextStyle]}>{label}</Text>
            </View>
        </GestureDetector>
    );
}

// ─── 옵션 알약 버튼 (front의 px-3 py-1.5 옵션 칩과 동일, 자동 너비 + 줄바꿈) ─────
function Pill({
    label, active, onPress, variant = 'sky',
}: {
    label: string;
    active: boolean;
    onPress: () => void;
    variant?: 'sky' | 'green';
}) {
    const green = variant === 'green';
    const tap = Gesture.Tap().onEnd(() => {
        'worklet';
        scheduleOnRN(onPress);
    });
    return (
        <GestureDetector gesture={tap}>
            <View style={[ss.pill, green && ss.pillGreenIdle, active && (green ? ss.pillGreenActive : ss.pillActive)]}>
                <Text style={[ss.pillText, green && ss.pillTextGreen, active && (green ? ss.pillGreenTextActive : ss.pillTextActive)]}>{label}</Text>
            </View>
        </GestureDetector>
    );
}

// ─── 프리셋 선택 + 직접입력 (성별/나이/경력/인원) ──────────────────────────────
export function ChoiceField({
    label, options, value, onChange, allowCustom = false, customPlaceholder = '직접 입력',
}: {
    label: string;
    options: string[];
    value: string;
    onChange: (v: string) => void;
    allowCustom?: boolean;
    customPlaceholder?: string;
}) {
    const isPreset = options.includes(value);
    const [isCustom, setIsCustom] = useState(allowCustom && !!value && !isPreset);
    const [customValue, setCustomValue] = useState(!isPreset ? value : '');

    return (
        <View style={ss.fieldCol}>
            <Label text={label} />
            <View style={ss.pillRow}>
                {options.map((opt) => (
                    <Pill
                        key={opt}
                        label={opt}
                        active={!isCustom && value === opt}
                        onPress={() => { setIsCustom(false); onChange(opt); }}
                    />
                ))}
                {allowCustom && (
                    <Pill
                        label="직접입력"
                        active={isCustom}
                        onPress={() => { setIsCustom(true); onChange(customValue); }}
                    />
                )}
            </View>
            {isCustom && (
                <TextInput
                    style={ss.input}
                    value={customValue}
                    onChangeText={(t) => { setCustomValue(t); onChange(t); }}
                    placeholder={customPlaceholder}
                    placeholderTextColor="#94a3b8"
                />
            )}
        </View>
    );
}

// ─── 미제공/제공 + 상세 (교통비/숙소/숙소비/일비/영업비/프로모션) ──────────────
export function ProvideField({
    label, placeholder, value, onChange,
}: {
    label: string;
    placeholder: string;
    value: string;
    onChange: (v: string) => void;
}) {
    const isProvide = !!value && value !== '미제공';
    const [showDetail, setShowDetail] = useState(isProvide);
    const [detail, setDetail] = useState(isProvide ? value : '');

    return (
        <View style={ss.fieldCol}>
            <Label text={label} />
            <View style={ss.pillRow}>
                <Pill label="미제공" active={value === '미제공'} onPress={() => { setShowDetail(false); onChange('미제공'); }} />
                <Pill label="제공" active={showDetail} onPress={() => { setShowDetail(true); onChange(detail); }} />
            </View>
            {showDetail && (
                <TextInput
                    style={ss.input}
                    value={detail}
                    onChangeText={(t) => { setDetail(t); onChange(t); }}
                    placeholder={placeholder}
                    placeholderTextColor="#94a3b8"
                />
            )}
        </View>
    );
}

// ─── 식사 (다중 선택 + 직접입력) ──────────────────────────────────────────────
export function MealField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const parsePreset = (): string[] => {
        if (!value) return [];
        const parts = value.split(', ');
        return parts.every((p) => MEAL_OPTIONS.includes(p)) ? parts : [];
    };
    const initialIsCustom = !!value && !value.split(', ').every((p) => MEAL_OPTIONS.includes(p));
    const [isCustom, setIsCustom] = useState(initialIsCustom);
    const [selected, setSelected] = useState<string[]>(parsePreset);
    const [customValue, setCustomValue] = useState(initialIsCustom ? value : '');

    const toggleMeal = (meal: string) => {
        const next = selected.includes(meal) ? selected.filter((m) => m !== meal) : [...selected, meal];
        setSelected(next);
        setIsCustom(false);
        onChange(next.join(', '));
    };

    return (
        <View style={ss.fieldCol}>
            <Label text="식사" />
            <View style={ss.pillRow}>
                {MEAL_OPTIONS.map((meal) => (
                    <Pill key={meal} label={meal} active={!isCustom && selected.includes(meal)} onPress={() => toggleMeal(meal)} />
                ))}
                <Pill
                    label="직접입력"
                    active={isCustom}
                    onPress={() => { setIsCustom(true); setSelected([]); onChange(customValue); }}
                />
            </View>
            {isCustom && (
                <TextInput
                    style={ss.input}
                    value={customValue}
                    onChangeText={(t) => { setCustomValue(t); onChange(t); }}
                    placeholder="ex) 식사 제공 / 식대 10만"
                    placeholderTextColor="#94a3b8"
                />
            )}
        </View>
    );
}

export function MultiChipGroup({
    options, selected, onToggle,
}: {
    options: string[];
    selected: string[];
    onToggle: (v: string) => void;
}) {
    return (
        <View style={ss.chipRow}>
            {options.map((opt) => (
                <ChipButton
                    key={opt}
                    label={opt}
                    active={selected.includes(opt)}
                    onPress={() => onToggle(opt)}
                    activeChipStyle={ss.chipActive}
                    activeTextStyle={ss.chipTextActive}
                />
            ))}
        </View>
    );
}

export function RadioChipGroup({
    options, selected, onSelect,
}: {
    options: string[];
    selected: string;
    onSelect: (v: string) => void;
}) {
    return (
        <View style={ss.chipRow}>
            {options.map((opt) => (
                <ChipButton
                    key={opt}
                    label={opt}
                    active={selected === opt}
                    onPress={() => onSelect(opt)}
                    activeChipStyle={ss.chipActive}
                    activeTextStyle={ss.chipTextActive}
                />
            ))}
        </View>
    );
}

export function FeeTypeChipGroup({
    options, selected, onSelect,
}: {
    options: string[];
    selected: string;
    onSelect: (v: string) => void;
}) {
    return (
        <View style={ss.pillRow}>
            {options.map((opt) => (
                <Pill
                    key={opt}
                    label={opt}
                    active={selected === opt}
                    onPress={() => onSelect(opt)}
                    variant="green"
                />
            ))}
        </View>
    );
}

// ─── 공용 스타일 ───────────────────────────────────────────────────────────────


export const ss = StyleSheet.create({
    // 평면형: front처럼 흰 배경에 카드/그림자 없이 여백으로 구분 (가로 여백은 페이지에서 처리)
    section: {
        paddingVertical: 4,
        gap: 12,
    },
    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
    sectionSub: { fontSize: 12, color: '#64748b', marginLeft: 'auto' },
    label: { fontSize: 14, fontWeight: '500', color: '#334155', marginTop: 2 },
    // 웹은 필수 표시가 primary-500(파랑). 빨강이 아니다.
    required: { color: '#3b82f6' },
    input: {
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 13,
        fontSize: 14,
        color: '#1e293b',
        backgroundColor: '#fff',
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
        // 줄 너비를 꽉 채우도록: 기본 3칸(basis 30%) + 남는 공간을 균등 분배(flexGrow)
        flexGrow: 1,
        flexBasis: '30%',
        paddingVertical: 12,
        paddingHorizontal: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#fff',
        alignItems: 'center',
    },
    // 웹의 큰 그리드 버튼: 선택 시 배경/테두리만 바뀌고 글자색은 그대로 (작은 알약과 다른 점)
    chipActive: { backgroundColor: '#dbeafe', borderColor: '#3b82f6' },
    chipText: { fontSize: 14, fontWeight: '500', color: '#334155' },
    chipTextActive: { color: '#334155', fontWeight: '500' },
    chipGreen: { borderColor: '#e2e8f0', backgroundColor: '#fff' },
    chipGreenActive: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
    chipGreenTextActive: { color: '#fff', fontWeight: '700' },

    // 옵션 알약(작은 칩) — 성별/나이/경력/인원, 식사, 미제공/제공 등
    fieldCol: { gap: 6 },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    pill: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#fff',
    },
    pillActive: { backgroundColor: '#dbeafe', borderColor: '#3b82f6' },
    pillText: { fontSize: 12, fontWeight: '500', color: '#475569' },
    pillTextGreen: { fontSize: 14 },
    pillTextActive: { color: '#1d4ed8', fontWeight: '500' },
    // 수수료 형태(초록) 변형 — front의 green 칩
    pillGreenIdle: { borderColor: '#86efac' },
    pillGreenActive: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
    pillGreenTextActive: { color: '#fff', fontWeight: '500' },
});
