import {
  View, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useState, useEffect } from 'react';
import { Text } from '@/components/common/AppText';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ICON_LIST, ICON_COLORS, industries as INDUSTRY_LIST } from '@/lib/constants';
import { getImageUrl } from '@/lib/lib';

// require() 결과는 번들러가 처리하는 asset id (number|object)라 union 타입이 까다로워 any 로 둔다.
const DEFAULT_JOB_IMAGE = require('@/assets/images/job_default_image.jpg');

export interface JobItem {
  id: number;
  thumbnail: string;
  /** 원본 이미지(imgs[0]). 큰 카드는 썸네일 대신 이걸 쓴다. 목록 API가 안 주면 null */
  image?: string | null;
  point: string;
  title: string;
  feeType: string;
  fee: string;
  tags: string[];
  industries?: string[];
  jobCategories?: string[];
  icons?: number[];
  isDisplay?: boolean; // true: 진행중, false: 마감
  dday?: number | null; // 마감까지 남은 일수 (생성일+10일 기준). null이면 미정
}

// 마감 D-day 배지 색 (웹과 동일: 연한 배경 + 글자색)
const BADGE_BLUE = { bg: '#eff6ff', text: '#1d4ed8' }; // 여유 (primary-50 / primary-700)
const BADGE_RED = { bg: '#fff1f2', text: '#e11d48' }; // 임박 D-3 미만 (rose-50 / rose-600)
const BADGE_GRAY = { bg: '#f1f5f9', text: '#64748b' }; // 마감 (slate-100 / slate-500)

function getDeadlineBadge(job: JobItem): { label: string; c: { bg: string; text: string } } | null {
  if (job.isDisplay === false) return { label: '마감', c: BADGE_GRAY };
  const dday = job.dday;
  if (dday == null) return null;
  const label = dday <= 0 ? 'D-DAY' : `D-${dday}`;
  return { label, c: dday < 3 ? BADGE_RED : BADGE_BLUE };
}

interface JobCardProps {
  job: JobItem;
  onPress?: (job: JobItem) => void;
  /** home 전용: 프리미엄=세로형(풀폭 썸네일), top=가로형 대형 썸네일, free=기본 가로형 */
  variant?: 'premium' | 'top' | 'free';
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

export function JobCard({ job, onPress, variant = 'free' }: JobCardProps) {
  const vertical = variant === 'premium';
  // 카드는 크기와 무관하게 원본(imgs[0])을 쓴다 — 썸네일은 100×100이라 어느 크기에서도 뭉개진다.
  // 목록 API가 image를 안 주는 경우(구버전 응답)에만 썸네일로 폴백.
  const imageUri = job.image ? getImageUrl(job.image) : (job.thumbnail ? getImageUrl(job.thumbnail) : null);

  // 값은 있지만 로드가 실패하는 케이스(스크랩된 외부 이미지가 만료·404) 대응.
  // failed=true 가 되면 이후 렌더에서 기본 이미지로 폴백한다. job 이 바뀌면 상태 초기화.
  const [failed, setFailed] = useState(false);
  // 사진의 가로/세로 비율(w/h). 알기 전에는 권장 규격 4:3 으로 틀을 꽉 채운다.
  const [ratio, setRatio] = useState(4 / 3);
  useEffect(() => { setFailed(false); setRatio(4 / 3); }, [imageUri]);
  const showDefault = !imageUri || failed;
  // 프리미엄·일반은 가로를 항상 100% 로 채운다(웹 JobCard fitWidth 와 같음) — 가로로 긴 배너의
  // 양옆(현장명·전화번호)이 cover 로 잘려 나갔다. 틀(4:3)보다 길면 아래만 잘리고 짧으면 아래가 배경.
  // 지역TOP 은 정사각형이라 예전처럼 가운데 기준 cover.
  const fitWidth = variant !== 'top';

  // 마감 배지·아이콘 자리 — 웹 JobCard 와 같다.
  //   일반: 태그 줄 오른쪽에 마감 배지 + 아이콘 / 지역TOP: 태그 줄 오른쪽에 아이콘(마감은 상단)
  //   프리미엄: 아이콘은 썸네일 좌측 상단(마감은 상단)
  // 예전엔 카드 맨 아래에 한 줄을 더 써서 카드가 길어졌고, 웹은 태그와 겹쳤다.
  const inlineBadge = variant === 'free' ? getDeadlineBadge(job) : null;
  const iconViews = (job.icons ?? []).map((id) => {
    const icon = ICON_LIST.find((i) => i.id === id);
    if (!icon) return null;
    const c = ICON_COLORS[icon.color] ?? ICON_COLORS.blue;
    return (
      <View key={id} style={[styles.badge, { backgroundColor: c.bg, borderColor: c.border }]}>
        <Text style={[styles.badgeText, { color: c.text }]}>{icon.name}</Text>
      </View>
    );
  }).filter(Boolean);

  // 썸네일 박스: 프리미엄=풀폭 4:3, top=대형 정사각(128), free=기본(80)
  const thumbWrapStyle =
    vertical ? styles.thumbWrapVertical : variant === 'top' ? styles.thumbWrapTop : styles.thumbWrap;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(job)}
      activeOpacity={0.85}
    >
      {/* 마감 D-day 배지 — free는 상단 텍스트를 가리지 않도록 하단 아이콘 뱃지 행에 인라인으로 렌더 */}
      {(() => {
        const badge = getDeadlineBadge(job);
        if (!badge) return null;
        if (variant === 'free') return null;
        return (
          <View style={[styles.ddayBadge, { backgroundColor: badge.c.bg }]}>
            <Text style={[styles.ddayText, { color: badge.c.text }]}>{badge.label}</Text>
          </View>
        );
      })()}

      <View style={vertical ? styles.col : styles.row}>
        {/* 썸네일 */}
        <View style={thumbWrapStyle}>
          <Image
            source={showDefault ? DEFAULT_JOB_IMAGE : { uri: imageUri! }}
            // fitWidth: 가로 100% + 사진 제 비율 높이. 틀(overflow hidden)이 넘치는 아래를 자른다.
            style={fitWidth ? { width: '100%', aspectRatio: ratio } : styles.thumb}
            contentFit="cover"
            contentPosition={fitWidth ? 'top' : 'center'}
            transition={200}
            onLoad={(e) => {
              const { width: w, height: h } = e.source;
              if (w > 0 && h > 0) setRatio(w / h);
            }}
            onError={() => setFailed(true)}
          />
          {vertical && iconViews.length > 0 && (
            <View style={styles.thumbIcons} pointerEvents="none">{iconViews}</View>
          )}
        </View>

        {/* 내용 */}
        <View style={vertical ? styles.contentVertical : styles.content}>
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

          {/* 태그 줄 — 태그(왼쪽, 한 줄·넘치면 페이드) + 마감 배지·아이콘(오른쪽 고정 자리) */}
          {(() => {
            const tagItems = buildTags(job);
            const right = !vertical && (inlineBadge || iconViews.length > 0);
            if (tagItems.length === 0 && !right) return null;
            return (
              <View style={styles.tagLine}>
                <View style={styles.tagsWrap}>
                  <View style={styles.tags}>
                    {tagItems.map((t, i) => (
                      <View key={`${t.label}-${i}`} style={[styles.tag, { backgroundColor: t.c.bg, borderColor: t.c.border }]}>
                        <Text style={[styles.tagText, { color: t.c.text }]} numberOfLines={1}>{t.label}</Text>
                      </View>
                    ))}
                  </View>
                  {/* 잘린 태그가 칼로 자른 듯 보이지 않게 오른쪽 끝을 흐린다(웹의 mask 와 같은 역할) */}
                  <LinearGradient
                    colors={['rgba(255,255,255,0)', '#fff']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.tagsFade}
                    pointerEvents="none"
                  />
                </View>
                {right && (
                  <View style={styles.tagRight}>
                    {inlineBadge && (
                      <View style={[styles.inlineDday, { backgroundColor: inlineBadge.c.bg }]}>
                        <Text style={[styles.ddayText, { color: inlineBadge.c.text }]}>{inlineBadge.label}</Text>
                      </View>
                    )}
                    {iconViews}
                  </View>
                )}
              </View>
            );
          })()}
        </View>
      </View>

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
    borderColor: '#f1f5f9',
  },
  ddayBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ddayText: {
    fontSize: 9,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    gap: 10,
  },
  // 일반: 4:3 (정사각형이던 것을 권장 규격에 맞췄다)
  thumbWrap: {
    width: 96,
    height: 72,
    borderRadius: 10,
    overflow: 'hidden',
    flexShrink: 0,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
  },
  // 프리미엄: 풀폭 4:3 (보더 없음)
  thumbWrapVertical: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
  },
  // 지역 TOP: 대형 정사각 썸네일 (보더 없음)
  thumbWrapTop: {
    width: 128,
    height: 128,
    borderRadius: 10,
    overflow: 'hidden',
    flexShrink: 0,
    backgroundColor: '#f8fafc',
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
  contentVertical: {
    width: '100%',
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
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    lineHeight: 21,
  },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  feeType: {
    fontSize: 10,
    color: '#94a3b8',
  },
  fee: {
    fontSize: 15,
    fontWeight: '700',
    color: '#64748b', // text-slate-500 (웹과 동일)
  },
  tagLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  tagsWrap: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 4,
  },
  tagsFade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 18,
  },
  tagRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  thumbIcons: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
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
    fontWeight: '400',
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
  inlineDday: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
});
