import { View, TextInput, StyleSheet } from 'react-native';
import { SectionHeader, ss } from './shared';

interface Props {
    detailContent: string;
    onDetailContentChange: (v: string) => void;
}

export function DetailSection({ detailContent, onDetailContentChange }: Props) {
    return (
        <View style={ss.section}>
            <SectionHeader title="상세 내용" />
            <TextInput
                style={s.bioInput}
                value={detailContent}
                onChangeText={onDetailContentChange}
                placeholder="현장 및 근무 조건에 대해 자세히 작성해주세요."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={8}
                textAlignVertical="top"
            />
        </View>
    );
}

const s = StyleSheet.create({
    bioInput: {
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 12,
        padding: 12,
        fontSize: 14,
        color: '#111827',
        minHeight: 160,
        backgroundColor: '#f9fafb',
    },
});
