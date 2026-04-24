import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ICON_LIST, ICON_COLORS } from '@/lib/constants';

export interface JobItem {
  id: number;
  thumbnail: string;
  point: string;
  title: string;
  feeType: string;
  fee: string;
  tags: string[];
  icons?: number[];
}

interface JobCardProps {
  job: JobItem;
  onPress?: (job: JobItem) => void;
}

const TAG_COLORS = [
  { bg: '#fff1f2', text: '#e11d48', border: '#fecdd3' },
  { bg: '#eef2ff', text: '#4f46e5', border: '#c7d2fe' },
  { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
];

const IMAGE_PREFIX = process.env.EXPO_PUBLIC_IMAGE_PREFIX ?? '';

export function JobCard({ job, onPress }: JobCardProps) {
  const imageUri = job.thumbnail ? `${IMAGE_PREFIX}${job.thumbnail}` : null;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(job)}
      activeOpacity={0.85}
    >
      <View style={styles.row}>
        {/* 썸네일 */}
        <View style={styles.thumbWrap}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.thumb}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={[styles.thumb, styles.thumbPlaceholder]}>
              <Ionicons name="image-outline" size={24} color="#d1d5db" />
            </View>
          )}
        </View>

        {/* 내용 */}
        <View style={styles.content}>
          {/* 위치 */}
          <View style={styles.locationRow}>
            <Ionicons name="location-sharp" size={11} color="#d97706" />
            <Text style={styles.locationText} numberOfLines={1}>{job.point || '-'}</Text>
          </View>

          {/* 제목 */}
          <Text style={styles.title} numberOfLines={2}>{job.title}</Text>

          {/* 수수료 */}
          <View style={styles.feeRow}>
            {!!job.feeType && <Text style={styles.feeType}>{job.feeType}</Text>}
            <Text style={styles.fee}>{job.fee}</Text>
          </View>

          {/* 태그 */}
          {job.tags.length > 0 && (
            <View style={styles.tags}>
              {job.tags.slice(0, 3).map((tag, i) => {
                const c = TAG_COLORS[i % TAG_COLORS.length];
                return (
                  <View key={tag} style={[styles.tag, { backgroundColor: c.bg, borderColor: c.border }]}>
                    <Text style={[styles.tagText, { color: c.text }]}>{tag}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>

      {/* 아이콘 뱃지 */}
      {(job.icons?.length ?? 0) > 0 && (
        <View style={styles.badges}>
          {job.icons!.map((id) => {
            const icon = ICON_LIST.find((i) => i.id === id);
            if (!icon) return null;
            const c = ICON_COLORS[icon.color] ?? ICON_COLORS.blue;
            return (
              <View key={id} style={[styles.badge, { backgroundColor: c.bg, borderColor: c.border }]}>
                <Text style={[styles.badgeText, { color: c.text }]}>{icon.name}</Text>
              </View>
            );
          })}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  thumbWrap: {
    width: 84,
    height: 84,
    borderRadius: 10,
    overflow: 'hidden',
    flexShrink: 0,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    backgroundColor: '#f9fafb',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  locationText: {
    fontSize: 11,
    color: '#d97706',
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 20,
  },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  feeType: {
    fontSize: 10,
    color: '#9ca3af',
  },
  fee: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0284c7',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  tag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 8,
    justifyContent: 'flex-end',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
});
