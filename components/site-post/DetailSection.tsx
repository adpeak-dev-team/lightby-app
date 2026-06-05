import {
  View, TextInput, StyleSheet,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { SectionHeader, ss } from './shared';

interface Props {
    detailContent: string;
    onDetailContentChange: (v: string) => void;
    siteUrl: string;
    onSiteUrlChange: (v: string) => void;
}

export function DetailSection({ detailContent, onDetailContentChange, siteUrl, onSiteUrlChange }: Props) {
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
            <Text style={s.label}>사이트 주소 <Text style={s.optional}>(선택)</Text></Text>
            <TextInput
                style={ss.input}
                value={siteUrl}
                onChangeText={onSiteUrlChange}
                placeholder="ex) https://www.example.com"
                placeholderTextColor="#9ca3af"
                keyboardType="url"
                autoCapitalize="none"
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
        marginBottom: 12,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 6,
    },
    optional: {
        fontSize: 11,
        fontWeight: '400',
        color: '#9ca3af',
    },
});
