import { View } from 'react-native';
import { SectionHeader, MultiChipGroup, INDUSTRIES, ss } from './shared';

interface Props {
    workIndustry: string[];
    onToggle: (v: string) => void;
}

export function IndustrySection({ workIndustry, onToggle }: Props) {
    return (
        <View style={ss.section}>
            <SectionHeader title="업종 분류" sub="여러 개 선택 가능" />
            <MultiChipGroup
                options={INDUSTRIES}
                selected={workIndustry}
                onToggle={onToggle}
            />
        </View>
    );
}
