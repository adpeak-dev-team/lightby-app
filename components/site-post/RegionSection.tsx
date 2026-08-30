import {
  View,
} from 'react-native';
import { TextInput } from '@/components/common/AppTextInput';
import { Text } from '@/components/common/AppText';
import { KakaoPostcode } from '@/components/common/KakaoPostcode';
import { KakaoMap } from '@/components/common/KakaoMap';
import { SectionHeader, Label, RadioChipGroup, REGIONS, ss } from './shared';

interface Props {
    address: string;
    addressDetail: string;
    onAddressDetailChange: (v: string) => void;
    latitude: number | null;
    longitude: number | null;
    onAddressSelect: (address: string, lat: number, lng: number) => void;
    workRegions: string;
    onRegionSelect: (v: string) => void;
}

export function RegionSection({
    address, addressDetail, onAddressDetailChange,
    latitude, longitude, onAddressSelect,
    workRegions, onRegionSelect,
}: Props) {
    // 지도 노출은 로컬 state가 아니라 address/좌표에서 파생시킨다.
    // (이전 공고 불러오기·공고 수정처럼 주소가 폼 밖에서 채워지는 경로가 있어,
    //  "주소 검색을 눌렀을 때만" 켜지는 state로는 지도가 뜨지 않는다)
    const hasAddress = address.trim() !== '';
    const hasCoords =
        latitude !== null && longitude !== null && latitude !== 0 && longitude !== 0;

    return (
        <View style={ss.section}>
            <SectionHeader title="현장 주소 / 근무 지역" required />

            <Label text="현장 주소" required />
            <KakaoPostcode address={address} hasCoords={hasCoords} onSelect={onAddressSelect} />
            {hasAddress && (
                hasCoords
                    ? <KakaoMap latitude={latitude!} longitude={longitude!} label={address} />
                    : <Text style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
                        📍 {address}
                    </Text>
            )}

            <Label text="상세 주소" />
            <TextInput
                style={ss.input}
                value={addressDetail}
                onChangeText={onAddressDetailChange}
                placeholder="ex) 101동 / 3층"
                placeholderTextColor="#94a3b8"
            />

            <Label text="근무 지역" required />
            <RadioChipGroup
                options={REGIONS}
                selected={workRegions}
                onSelect={onRegionSelect}
            />
        </View>
    );
}
