import { View, Text, StyleSheet } from 'react-native';
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

export const FEE_TYPES = ['본부', '팀', '직원', '상담시'];

// ─── 공용 UI 컴포넌트 ──────────────────────────────────────────────────────────

export function SectionHeader({ title, sub }: { title: string; sub?: string }) {
    return (
        <View style={ss.sectionHeaderRow}>
            <View style={ss.sectionBar} />
            <Text style={ss.sectionTitle}>{title}</Text>
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
        <View style={ss.chipRow}>
            {options.map((opt) => (
                <ChipButton
                    key={opt}
                    label={opt}
                    active={selected === opt}
                    onPress={() => onSelect(opt)}
                    extraChipStyle={ss.chipGreen}
                    activeChipStyle={ss.chipGreenActive}
                    activeTextStyle={ss.chipGreenTextActive}
                />
            ))}
        </View>
    );
}

// ─── 공용 스타일 ───────────────────────────────────────────────────────────────

const CHIP_WIDTH = '31%';

export const ss = StyleSheet.create({
    section: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
        gap: 10,
    },
    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    sectionBar: { width: 4, height: 16, borderRadius: 2, backgroundColor: '#3b82f6' },
    sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1f2937' },
    sectionSub: { fontSize: 11, color: '#9ca3af', marginLeft: 'auto' },
    label: { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 2 },
    required: { color: '#f87171' },
    input: {
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: '#111827',
        backgroundColor: '#f9fafb',
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
    chip: {
        width: CHIP_WIDTH,
        marginRight: '2%',
        marginBottom: 8,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#e5e7eb',
        backgroundColor: '#fff',
        alignItems: 'center',
    },
    chipActive: { backgroundColor: '#eff6ff', borderColor: '#3b82f6' },
    chipText: { fontSize: 12, fontWeight: '500', color: '#6b7280' },
    chipTextActive: { color: '#3b82f6', fontWeight: '700' },
    chipGreen: { borderColor: '#e5e7eb', backgroundColor: '#fff' },
    chipGreenActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
    chipGreenTextActive: { color: '#fff', fontWeight: '700' },
});
