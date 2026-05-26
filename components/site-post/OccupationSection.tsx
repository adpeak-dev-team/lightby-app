import { View, TextInput } from 'react-native';
import { SectionHeader, Label, MultiChipGroup, JOB_TYPES, ss } from './shared';

interface Props {
    workOccupation: string[];
    onToggle: (v: string) => void;
    requireGender: string;
    onRequireGenderChange: (v: string) => void;
    requireAge: string;
    onRequireAgeChange: (v: string) => void;
    careerPeriod: string;
    onCareerPeriodChange: (v: string) => void;
    headCount: string;
    onHeadCountChange: (v: string) => void;
}

export function OccupationSection({
    workOccupation, onToggle,
    requireGender, onRequireGenderChange,
    requireAge, onRequireAgeChange,
    careerPeriod, onCareerPeriodChange,
    headCount, onHeadCountChange,
}: Props) {
    return (
        <View style={ss.section}>
            <SectionHeader title="직종 분류" sub="여러 개 선택 가능" />
            <MultiChipGroup
                options={JOB_TYPES}
                selected={workOccupation}
                onToggle={onToggle}
            />
            <Label text="성별" />
            <TextInput
                style={ss.input}
                value={requireGender}
                onChangeText={onRequireGenderChange}
                placeholder="ex) 남자 / 여자 / 무관"
                placeholderTextColor="#9ca3af"
            />
            <Label text="나이" />
            <TextInput
                style={ss.input}
                value={requireAge}
                onChangeText={onRequireAgeChange}
                placeholder="ex) 30대 / 40대 / 무관"
                placeholderTextColor="#9ca3af"
            />
            <Label text="경력" />
            <TextInput
                style={ss.input}
                value={careerPeriod}
                onChangeText={onCareerPeriodChange}
                placeholder="ex) 10년 / 초보"
                placeholderTextColor="#9ca3af"
            />
            <Label text="인원" />
            <TextInput
                style={ss.input}
                value={headCount}
                onChangeText={onHeadCountChange}
                placeholder="ex) 2명 / 00명"
                placeholderTextColor="#9ca3af"
            />
        </View>
    );
}
