import { View, TextInput } from 'react-native';
import { SectionHeader, Label, ss } from './shared';

interface Props {
    address: string;
    onAddressChange: (v: string) => void;
}

export function AddressSection({ address, onAddressChange }: Props) {
    return (
        <View style={ss.section}>
            <SectionHeader title="현장 주소" />
            <Label text="주소" />
            <TextInput
                style={ss.input}
                value={address}
                onChangeText={onAddressChange}
                placeholder="ex) 경기도 성남시 분당구 OO동"
                placeholderTextColor="#9ca3af"
            />
        </View>
    );
}
