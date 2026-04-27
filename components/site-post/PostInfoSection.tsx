import { View, TextInput } from 'react-native';
import { SectionHeader, Label, ss } from './shared';

interface Props {
    subject: string;
    onSubjectChange: (v: string) => void;
    intro: string;
    onIntroChange: (v: string) => void;
}

export function PostInfoSection({ subject, onSubjectChange, intro, onIntroChange }: Props) {
    return (
        <View style={ss.section}>
            <SectionHeader title="공고 정보" />
            <Label text="공고 제목" required />
            <TextInput
                style={ss.input}
                value={subject}
                onChangeText={onSubjectChange}
                placeholder="ex) OO신도시 아파트 분양 팀장 구인"
                placeholderTextColor="#9ca3af"
                maxLength={80}
            />
            <Label text="현장 한마디" />
            <TextInput
                style={ss.input}
                value={intro}
                onChangeText={onIntroChange}
                placeholder="ex) 안정적인 수수료, 친절한 팀 분위기"
                placeholderTextColor="#9ca3af"
                maxLength={100}
            />
        </View>
    );
}
