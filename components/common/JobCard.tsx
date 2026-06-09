import {
  View, TouchableOpacity, StyleSheet,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ICON_LIST, ICON_COLORS, industries as INDUSTRY_LIST } from '@/lib/constants';
import { getImageUrl } from '@/lib/lib';

export interface JobItem {
  id: number;
  thumbnail: string;
  point: string;
  title: string;
  feeType: string;
  fee: string;
  tags: string[];
  industries?: string[];
  jobCategories?: string[];
  icons?: number[];
}

interface JobCardProps {
  job: JobItem;
  onPress?: (job: JobItem) => void;
}

// 업종/직종 구분 색 (업종=앰버, 직종=그린) — 금액(sky)과 겹치지 않도록
const INDUSTRY_COLOR = { bg: '#fffbeb', text: '#d97706', border: '#fde68a' };
const JOB_COLOR = { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' };

function buildTags(job: JobItem): { label: string; c: { bg: string; text: string; border: string } }[] {
  const hasTyped = (job.industries?.length ?? 0) > 0 || (job.jobCategories?.length ?? 0) > 0;
  if (hasTyped) {
    return [
      ...(job.industries ?? []).map((label) => ({ label, c: INDUSTRY_COLOR })),
      ...(job.jobCategories ?? []).map((label) => ({ label, c: JOB_COLOR })),
    ];
  }
  // industries/jobCategories가 분리돼 오지 않는 화면(관심/맞춤/찜 목록)에서는
  // tags 문자열을 업종 목록과 대조해 업종(앰버)/직종(그린) 2색으로 분류한다.
  return job.tags.map((label) => ({
    label,
    c: INDUSTRY_LIST.includes(label) ? INDUSTRY_COLOR : JOB_COLOR,
  }));
}

export function JobCard({ job, onPress }: JobCardProps) {
  const imageUri = job.thumbnail ? getImageUrl(job.thumbnail) : null;

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
            <Ionicons name="location-sharp" size={11} color="#b45309" />
            <Text style={styles.locationText} numberOfLines={1}>{job.point || '-'}</Text>
          </View>

          {/* 제목 */}
          <Text style={styles.title} numberOfLines={1}>{job.title}</Text>

          {/* 수수료 */}
          <View style={styles.feeRow}>
            {!!job.feeType && <Text style={styles.feeType}>{job.feeType}</Text>}
            <Text style={styles.fee}>{job.fee}</Text>
          </View>

          {/* 태그 — 업종(블루)/직종(그린)별 색, 무조건 한 줄 */}
          {(() => {
            const tagItems = buildTags(job);
            if (tagItems.length === 0) return null;
            return (
              <View style={styles.tags}>
                {tagItems.map((t, i) => (
                  <View key={`${t.label}-${i}`} style={[styles.tag, { backgroundColor: t.c.bg, borderColor: t.c.border }]}>
                    <Text style={[styles.tagText, { color: t.c.text }]} numberOfLines={1}>{t.label}</Text>
                  </View>
                ))}
              </View>
            );
          })()}
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
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  thumbWrap: {
    width: 80,
    height: 80,
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
    color: '#b45309',
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 21,
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
    fontWeight: '700',
    color: '#0284c7',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    overflow: 'hidden',
    gap: 4,
    marginTop: 2,
  },
  tag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    flexShrink: 0,
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
