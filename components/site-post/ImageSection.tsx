import { View } from 'react-native';
import SortableImage from '@/components/common/SortableImage';
import { SectionHeader, ss } from './shared';

interface Props {
    images: string[];
    onChange: (images: string[]) => void;
}

export function ImageSection({ images, onChange }: Props) {
    return (
        <View style={ss.section}>
            <SectionHeader title="현장 이미지" sub="최대 10장" />
            <SortableImage
                folder="job-posting"
                initialImages={images}
                onChange={onChange}
            />
        </View>
    );
}
