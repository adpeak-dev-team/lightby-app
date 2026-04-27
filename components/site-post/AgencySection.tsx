import { View, TextInput } from 'react-native';
import { SectionHeader, Label, ss } from './shared';

interface Props {
    agency: string;
    onAgencyChange: (v: string) => void;
    managerName: string;
    onManagerNameChange: (v: string) => void;
    managerPhone: string;
    onManagerPhoneChange: (v: string) => void;
}

export function AgencySection({
    agency, onAgencyChange,
    managerName, onManagerNameChange,
    managerPhone, onManagerPhoneChange,
}: Props) {
    return (
        <View style={ss.section}>
            <SectionHeader title="대행사 정보" />
            <Label text="분양대행사" required />
            <TextInput
                style={ss.input}
                value={agency}
                onChangeText={onAgencyChange}
                placeholder="ex) OO분양대행"
                placeholderTextColor="#9ca3af"
            />
            <Label text="담당자 성함" required />
            <TextInput
                style={ss.input}
                value={managerName}
                onChangeText={onManagerNameChange}
                placeholder="ex) 홍길동"
                placeholderTextColor="#9ca3af"
            />
            <Label text="연락처" required />
            <TextInput
                style={ss.input}
                value={managerPhone}
                onChangeText={onManagerPhoneChange}
                placeholder="ex) 010-1234-5678"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
            />
        </View>
    );
}
