import { useState } from 'react';
import { View, Text } from 'react-native';
import { KakaoPostcode } from '@/components/common/KakaoPostcode';
import { KakaoMap } from '@/components/common/KakaoMap';
import { SectionHeader, Label, RadioChipGroup, REGIONS, ss } from './shared';

interface Props {
    address: string;
    latitude: number | null;
    longitude: number | null;
    onAddressSelect: (address: string, lat: number, lng: number) => void;
    workRegions: string;
    onRegionSelect: (v: string) => void;
}

export function RegionSection({
    address, latitude, longitude, onAddressSelect,
    workRegions, onRegionSelect,
}: Props) {
    const [showMap, setShowMap] = useState(false);

    const handleAddressSelect = (addr: string, lat: number, lng: number) => {
        console.log('[RegionSection] 주소 수신:', addr, lat, lng);
        if (addr) setShowMap(true);
        onAddressSelect(addr, lat, lng);
    };

    // 지도는 실제 좌표가 있을 때만, 없으면 주소 텍스트만 표시
    const hasCoords = showMap && latitude !== null && longitude !== null && latitude !== 0;

    return (
        <View style={ss.section}>
            <SectionHeader title="현장 주소 / 근무 지역" />

            <Label text="현장 주소" required />
            <KakaoPostcode address={address} onSelect={handleAddressSelect} />
            {showMap && (
                hasCoords
                    ? <KakaoMap latitude={latitude!} longitude={longitude!} label={address} />
                    : <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                        📍 {address}
                    </Text>
            )}

            <Label text="근무 지역" required />
            <RadioChipGroup
                options={REGIONS}
                selected={workRegions}
                onSelect={onRegionSelect}
            />
        </View>
    );
}
