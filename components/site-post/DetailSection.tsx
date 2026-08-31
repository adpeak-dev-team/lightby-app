import {
  View, StyleSheet,
} from 'react-native';
import { TextInput } from '@/components/common/AppTextInput';
import { Text } from '@/components/common/AppText';
import { KeyboardAwareTextInput } from '@/components/common/KeyboardAwareScroll';
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
            <KeyboardAwareTextInput
                style={s.bioInput}
                value={detailContent}
                onChangeText={onDetailContentChange}
                placeholder="현장 및 근무 조건에 대해 자세히 작성해주세요."
                placeholderTextColor="#94a3b8"
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
                placeholderTextColor="#94a3b8"
                keyboardType="url"
                autoCapitalize="none"
            />
        </View>
    );
}

const s = StyleSheet.create({
    bioInput: {
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        padding: 12,
        fontSize: 14,
        color: '#0f172a',
        minHeight: 160,
        backgroundColor: '#f8fafc',
        marginBottom: 12,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#334155',
        marginBottom: 6,
    },
    optional: {
        fontSize: 12,
        fontWeight: '400',
        color: '#94a3b8',
    },
});
