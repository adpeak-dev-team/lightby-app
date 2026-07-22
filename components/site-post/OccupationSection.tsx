import { View } from 'react-native';
import {
    SectionHeader, MultiChipGroup, ChoiceField,
    JOB_TYPES, GENDER_OPTIONS, AGE_OPTIONS, CAREER_OPTIONS, HEADCOUNT_OPTIONS, ss,
} from './shared';

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
            <SectionHeader title="직종 분류" sub="여러 개 선택 가능" required />
            <MultiChipGroup
                options={JOB_TYPES}
                selected={workOccupation}
                onToggle={onToggle}
            />
            <ChoiceField
                label="성별"
                options={GENDER_OPTIONS}
                value={requireGender}
                onChange={onRequireGenderChange}
            />
            <ChoiceField
                label="나이"
                options={AGE_OPTIONS}
                value={requireAge}
                onChange={onRequireAgeChange}
                allowCustom
                customPlaceholder="ex) 30대 이상"
            />
            <ChoiceField
                label="경력"
                options={CAREER_OPTIONS}
                value={careerPeriod}
                onChange={onCareerPeriodChange}
                allowCustom
                customPlaceholder="ex) 10년 이상"
            />
            <ChoiceField
                label="인원"
                options={HEADCOUNT_OPTIONS}
                value={headCount}
                onChange={onHeadCountChange}
                allowCustom
                customPlaceholder="ex) 10명"
            />
        </View>
    );
}
