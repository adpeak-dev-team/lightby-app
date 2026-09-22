import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';
import SortableImage from '@/components/common/SortableImage';
import { SectionHeader, ss } from './shared';

/**
 * 권장 규격 — 상세는 원본 비율, 목록 카드는 세 등급 모두 4:3 틀에 가로 100%(JobCard 참고).
 * 가로로 긴 사진은 안 잘리고 세로로 긴 사진만 아래가 잘려서, 중요한 건 위쪽에 두라고 안내한다.
 * 웹 등록 화면(WorkImage.tsx)과 같은 문구를 쓴다 — 한쪽만 고치면 안내가 갈린다.
 */
const HINTS = [
    '권장 크기 1200 × 900px (4:3 가로형)',
    '세로로 긴 사진은 목록에서 아래쪽이 잘립니다 — 현장명·로고·연락처는 위쪽에 넣어 주세요.',
    '세로로 긴 이미지는 상세 화면에서 작게 보입니다. 가로형을 권장합니다.',
    '첫 번째 이미지가 대표 이미지입니다. 끌어서 순서를 바꿀 수 있습니다.',
];

interface Props {
    images: string[];
    onChange: (images: string[]) => void;
}

export function ImageSection({ images, onChange }: Props) {
    return (
        <View style={ss.section}>
            <SectionHeader title="현장 이미지" sub="최대 10장" required />
            <SortableImage
                folder="job-posting"
                initialImages={images}
                onChange={onChange}
            />
            <View style={s.hints}>
                {HINTS.map((hint) => (
                    <Text key={hint} style={s.hint}>· {hint}</Text>
                ))}
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    hints: { marginTop: 10, gap: 3 },
    hint: { fontSize: 12, color: '#64748b', lineHeight: 18 },
});
