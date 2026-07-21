import { useState } from 'react';
import {
  View, TextInput,
} from 'react-native';
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
    const [showMap, setShowMap] = useState(false);

    const handleAddressSelect = (addr: string, lat: number, lng: number) => {
        if (addr) setShowMap(true);
        onAddressSelect(addr, lat, lng);
    };

    const hasCoords = showMap && latitude !== null && longitude !== null && latitude !== 0;

    return (
        <View style={ss.section}>
            <SectionHeader title="현장 주소 / 근무 지역" required />

            <Label text="현장 주소" required />
            <KakaoPostcode address={address} onSelect={handleAddressSelect} />
            {showMap && (
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
