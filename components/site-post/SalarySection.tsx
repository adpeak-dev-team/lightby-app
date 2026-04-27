import { View, Text, TextInput, StyleSheet } from 'react-native';
import { SectionHeader, Label, FeeTypeChipGroup, FEE_TYPES, ss } from './shared';

interface Props {
    feeType: string;
    onFeeTypeSelect: (v: string) => void;
    fee: string;
    onFeeChange: (v: string) => void;
    dailyPay: string;
    onDailyPayChange: (v: string) => void;
    accommodationPay: string;
    onAccommodationPayChange: (v: string) => void;
    promotion: string;
    onPromotionChange: (v: string) => void;
    baseSalary: string;
    onBaseSalaryChange: (v: string) => void;
}

export function SalarySection({
    feeType, onFeeTypeSelect,
    fee, onFeeChange,
    dailyPay, onDailyPayChange,
    accommodationPay, onAccommodationPayChange,
    promotion, onPromotionChange,
    baseSalary, onBaseSalaryChange,
}: Props) {
    return (
        <View style={ss.section}>
            <SectionHeader title="급여 및 영업지원" />

            <View style={s.payBox}>
                <Label text="수수료 타입" required />
                <FeeTypeChipGroup
                    options={FEE_TYPES}
                    selected={feeType}
                    onSelect={onFeeTypeSelect}
                />
                <Label text="수수료 금액" required />
                <View style={s.feeRow}>
                    <TextInput
                        style={[ss.input, s.feeInput]}
                        value={fee}
                        onChangeText={(v) => onFeeChange(v.replace(/[^0-9]/g, ''))}
                        placeholder="숫자만 입력"
                        placeholderTextColor="#9ca3af"
                        keyboardType="number-pad"
                    />
                    <Text style={s.feeUnit}>만 원</Text>
                </View>
                <Text style={s.feeHint}>정확한 수수료를 입력하시면 구인글 메인에 강조 노출되어 지원율이 높아집니다.</Text>
            </View>

            <View style={s.col}>
                <View style={s.field}>
                    <Label text="일비" />
                    <TextInput
                        style={ss.input}
                        value={dailyPay}
                        onChangeText={onDailyPayChange}
                        placeholder="ex) 월 100만 / 일 3만"
                        placeholderTextColor="#9ca3af"
                    />
                </View>
                <View style={s.field}>
                    <Label text="숙소비" />
                    <TextInput
                        style={ss.input}
                        value={accommodationPay}
                        onChangeText={onAccommodationPayChange}
                        placeholder="ex) 원룸 제공"
                        placeholderTextColor="#9ca3af"
                    />
                </View>
                <View style={s.field}>
                    <Label text="프로모션" />
                    <TextInput
                        style={ss.input}
                        value={promotion}
                        onChangeText={onPromotionChange}
                        placeholder="ex) 5채 판매시 추가 100만"
                        placeholderTextColor="#9ca3af"
                    />
                </View>
                <View style={s.field}>
                    <Label text="기본 급여" />
                    <TextInput
                        style={ss.input}
                        value={baseSalary}
                        onChangeText={onBaseSalaryChange}
                        placeholder="ex) 기본급 200만"
                        placeholderTextColor="#9ca3af"
                    />
                </View>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    payBox: {
        backgroundColor: '#f0fdf4',
        borderRadius: 14,
        padding: 16,
        gap: 10,
    },
    feeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    feeInput: { flex: 1, marginBottom: 0 },
    feeUnit: { fontSize: 14, fontWeight: '700', color: '#16a34a', minWidth: 36 },
    feeHint: { fontSize: 11, color: '#16a34a' },
    col: { flexDirection: 'column', gap: 12 },
    field: { gap: 6 },
});
