import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SectionHeader, Label, FeeTypeChipGroup, FEE_TYPES, ss } from './shared';
import { FeeItem } from '@/services/site/types';

const parseAmountRange = (amount: string): { min: string; max: string } => {
    const [minRaw, maxRaw] = amount.split('~');
    return { min: (minRaw ?? '').trim(), max: (maxRaw ?? '').trim() };
};

const joinAmountRange = (min: string, max: string): string => {
    if (!min && !max) return '';
    if (min && !max) return min;
    if (!min && max) return `~${max}`;
    return `${min}~${max}`;
};

interface Props {
    feeType: string;
    onFeeTypeSelect: (v: string) => void;
    fee: FeeItem[];
    onFeeChange: (v: FeeItem[]) => void;
    mealExpense: string;
    onMealExpenseChange: (v: string) => void;
    transportExpense: string;
    onTransportExpenseChange: (v: string) => void;
    housing: string;
    onHousingChange: (v: string) => void;
    accommodationExpenses: string;
    onAccommodationExpensesChange: (v: string) => void;
    dailyExpense: string;
    onDailyExpenseChange: (v: string) => void;
    businessExpense: string;
    onBusinessExpenseChange: (v: string) => void;
    promotion: string;
    onPromotionChange: (v: string) => void;
    baseSalary: string;
    onBaseSalaryChange: (v: string) => void;
}

export function SalarySection({
    feeType, onFeeTypeSelect,
    fee, onFeeChange,
    mealExpense, onMealExpenseChange,
    transportExpense, onTransportExpenseChange,
    housing, onHousingChange,
    accommodationExpenses, onAccommodationExpensesChange,
    dailyExpense, onDailyExpenseChange,
    businessExpense, onBusinessExpenseChange,
    promotion, onPromotionChange,
    baseSalary, onBaseSalaryChange,
}: Props) {
    const addFeeItem = () => onFeeChange([...fee, { category: '', amount: '' }]);

    const removeFeeItem = (index: number) => {
        if (fee.length === 1) return;
        onFeeChange(fee.filter((_, i) => i !== index));
    };

    const updateCategory = (index: number, value: string) => {
        onFeeChange(fee.map((item, i) => i === index ? { ...item, category: value } : item));
    };

    const updateAmount = (index: number, side: 'min' | 'max', value: string) => {
        const sanitized = value.replace(/[^0-9]/g, '');
        const current = parseAmountRange(fee[index].amount);
        const next = side === 'min'
            ? joinAmountRange(sanitized, current.max)
            : joinAmountRange(current.min, sanitized);
        onFeeChange(fee.map((item, i) => i === index ? { ...item, amount: next } : item));
    };

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

                <View style={s.feeHeader}>
                    <Label text="수수료 항목" required />
                    <TouchableOpacity onPress={addFeeItem} activeOpacity={0.7} style={s.addBtn}>
                        <Ionicons name="add" size={14} color="#16a34a" />
                        <Text style={s.addBtnText}>항목 추가</Text>
                    </TouchableOpacity>
                </View>

                {fee.map((item, index) => {
                    const { min, max } = parseAmountRange(item.amount);
                    return (
                        <View key={index} style={s.feeItemBlock}>
                            <TextInput
                                style={[ss.input, s.feeInput]}
                                value={item.category}
                                onChangeText={(v) => updateCategory(index, v)}
                                placeholder="ex) 아파트"
                                placeholderTextColor="#9ca3af"
                            />
                            <View style={s.feeAmountRow}>
                                <TextInput
                                    style={[ss.input, s.amountInput]}
                                    value={min}
                                    onChangeText={(v) => updateAmount(index, 'min', v)}
                                    placeholder="최소 ex) 500"
                                    placeholderTextColor="#9ca3af"
                                    keyboardType="number-pad"
                                />
                                <Text style={s.tilde}>~</Text>
                                <TextInput
                                    style={[ss.input, s.amountInput]}
                                    value={max}
                                    onChangeText={(v) => updateAmount(index, 'max', v)}
                                    placeholder="최대 ex) 1000"
                                    placeholderTextColor="#9ca3af"
                                    keyboardType="number-pad"
                                />
                                <TouchableOpacity
                                    onPress={() => removeFeeItem(index)}
                                    disabled={fee.length === 1}
                                    style={[s.removeBtn, fee.length === 1 && s.removeBtnDisabled]}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="trash-outline" size={14} color={fee.length === 1 ? '#d1d5db' : '#9ca3af'} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    );
                })}

                <View style={s.hintList}>
                    <Text style={s.feeHint}>• 수수료 최소 ~ 최대값 (고정일 경우 최대값만) 을 만원 단위로 입력해 주세요.</Text>
                    <Text style={s.feeHint}>• 여러 항목이 있을 경우 "항목 추가" 버튼을 활용해 주세요.</Text>
                    <Text style={s.feeHint}>• 입력된 값은 "최대값" 기준으로 메인에 노출됩니다.</Text>
                </View>
            </View>

            <View style={s.col}>
                <View style={s.field}>
                    <Label text="기본 급여" />
                    <TextInput
                        style={ss.input}
                        value={baseSalary}
                        onChangeText={onBaseSalaryChange}
                        placeholder="ex) 기본급 200만 / 미지급시 공란"
                        placeholderTextColor="#9ca3af"
                    />
                </View>

                <View style={s.row}>
                    <View style={[s.field, { flex: 1 }]}>
                        <Label text="식사" />
                        <TextInput
                            style={ss.input}
                            value={mealExpense}
                            onChangeText={onMealExpenseChange}
                            placeholder="ex) 식대 10만"
                            placeholderTextColor="#9ca3af"
                        />
                    </View>
                    <View style={[s.field, { flex: 1 }]}>
                        <Label text="교통비" />
                        <TextInput
                            style={ss.input}
                            value={transportExpense}
                            onChangeText={onTransportExpenseChange}
                            placeholder="ex) 월 20만"
                            placeholderTextColor="#9ca3af"
                        />
                    </View>
                </View>

                <View style={s.row}>
                    <View style={[s.field, { flex: 1 }]}>
                        <Label text="숙소" />
                        <TextInput
                            style={ss.input}
                            value={housing}
                            onChangeText={onHousingChange}
                            placeholder="ex) 원룸 제공"
                            placeholderTextColor="#9ca3af"
                        />
                    </View>
                    <View style={[s.field, { flex: 1 }]}>
                        <Label text="숙소비" />
                        <TextInput
                            style={ss.input}
                            value={accommodationExpenses}
                            onChangeText={onAccommodationExpensesChange}
                            placeholder="ex) 월 30만"
                            placeholderTextColor="#9ca3af"
                        />
                    </View>
                </View>

                <View style={s.row}>
                    <View style={[s.field, { flex: 1 }]}>
                        <Label text="일비" />
                        <TextInput
                            style={ss.input}
                            value={dailyExpense}
                            onChangeText={onDailyExpenseChange}
                            placeholder="ex) 일 3만"
                            placeholderTextColor="#9ca3af"
                        />
                    </View>
                    <View style={[s.field, { flex: 1 }]}>
                        <Label text="영업비" />
                        <TextInput
                            style={ss.input}
                            value={businessExpense}
                            onChangeText={onBusinessExpenseChange}
                            placeholder="ex) 월 50만"
                            placeholderTextColor="#9ca3af"
                        />
                    </View>
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
    feeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    addBtnText: { fontSize: 12, fontWeight: '700', color: '#16a34a' },
    feeItemBlock: {
        gap: 6,
        paddingVertical: 4,
    },
    feeInput: { marginBottom: 0 },
    feeAmountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    amountInput: {
        flex: 1,
        marginBottom: 0,
    },
    tilde: { fontSize: 14, color: '#6b7280' },
    removeBtn: {
        width: 32,
        height: 38,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    removeBtnDisabled: { opacity: 0.4 },
    hintList: { gap: 2, marginTop: 4 },
    feeHint: { fontSize: 11, color: '#16a34a', lineHeight: 16 },
    col: { flexDirection: 'column', gap: 12 },
    row: { flexDirection: 'row', gap: 10 },
    field: { gap: 6 },
});
