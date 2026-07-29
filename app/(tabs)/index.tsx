import { useCallback, useMemo, useRef, useState } from 'react';
import {
  SectionList, View, StyleSheet, ActivityIndicator, Animated, TouchableOpacity, Linking, useWindowDimensions, RefreshControl,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Carousel from 'react-native-reanimated-carousel';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Header from '@/components/common/Header';
import MainStats from '@/components/main/MainStats';
import SearchBar from '@/components/main/SearchBar';
import LocationTabs from '@/components/main/LocationTabs';
import { JobCard, JobItem } from '@/components/common/JobCard';
import { Fab } from '@/components/common/Fab';
import { useRequireLogin } from '@/hooks/use-require-login';
import { useGetJobsByProduct, useGetFreeJobsInfinite, useGetBanners } from '@/services/site/queries';
import { JobSummaryResponse } from '@/services/site/types';
import { getImageUrl, ddayFromCreatedAt } from '@/lib/lib';

// ─── 타입 변환 ─────────────────────────────────────────────────────────────────
function toJobItem(job: JobSummaryResponse): JobItem {
  let icons: number[] = [];
  try { icons = job.icons ? JSON.parse(job.icons) : []; } catch { icons = []; }
  return {
    id: job.id,
    thumbnail: job.thumbnail ?? '',
    image: job.image ?? null,
    point: job.point_content ?? '',
    title: job.title,
    feeType: job.feeType ?? '',
    fee: job.fee_max > 0 ? `${job.fee_max}만원` : '',
    tags: [
      ...(Array.isArray(job.industries) ? job.industries : []),
      ...(Array.isArray(job.jobCategories) ? job.jobCategories : []),
    ].filter(Boolean),
    industries: (Array.isArray(job.industries) ? job.industries : []).filter(Boolean),
    jobCategories: (Array.isArray(job.jobCategories) ? job.jobCategories : []).filter(Boolean),
    icons,
    isDisplay: job.is_display === undefined ? true : job.is_display === 1,
    dday: ddayFromCreatedAt(job.created_at),
  };
}

// ─── 섹션 설정 ─────────────────────────────────────────────────────────────────
type SectionType = 'premium' | 'top' | 'free';
const SECTION_CONFIG: Record<SectionType, {
  title: string; subtitle: string;
  icon: keyof typeof Ionicons.glyphMap; iconBg: string; iconColor: string;
}> = {
  premium: { title: '프리미엄 현장', subtitle: 'ADPEAK PREMIUM', icon: 'star', iconBg: '#fee2e2', iconColor: '#dc2626' }, // bg-red-100 text-red-600
  top: { title: '지역 TOP', subtitle: 'LOCAL BEST', icon: 'trophy', iconBg: '#dbeafe', iconColor: '#2563eb' }, // bg-primary-100 text-primary-600
  free: { title: '일반 공고', subtitle: 'FREE JOBS', icon: 'list', iconBg: '#f1f5f9', iconColor: '#475569' }, // bg-slate-100 text-slate-600
};

// ─── 스켈레톤 ────────────────────────────────────────────────────────────────
function SkeletonCard() {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useMemo(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[sk.card, { opacity }]}>
      <View style={sk.thumb} />
      <View style={sk.content}>
        <View style={sk.line1} />
        <View style={sk.line2} />
        <View style={sk.line3} />
        <View style={sk.line4} />
      </View>
    </Animated.View>
  );
}
const sk = StyleSheet.create({
  card: { flexDirection: 'row', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#f1f5f9' },
  thumb: { width: 84, height: 84, borderRadius: 10, backgroundColor: '#e2e8f0' },
  content: { flex: 1, gap: 8, justifyContent: 'center' },
  line1: { width: 80, height: 10, backgroundColor: '#e2e8f0', borderRadius: 5 },
  line2: { width: '90%', height: 14, backgroundColor: '#e2e8f0', borderRadius: 5 },
  line3: { width: 70, height: 12, backgroundColor: '#e2e8f0', borderRadius: 5 },
  line4: { width: 100, height: 10, backgroundColor: '#e2e8f0', borderRadius: 5 },
});

// ─── 섹션 헤더 ──────────────────────────────────────────────────────────────
function SectionHeader({ type }: { type: SectionType }) {
  const { title, subtitle, icon, iconBg, iconColor } = SECTION_CONFIG[type];
  return (
    <View style={s.sectionHeader}>
      <View style={[s.sectionIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={16} color={iconColor} />
      </View>
      <View>
        <Text style={s.sectionTitle}>{title}</Text>
        <Text style={s.sectionSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

// ─── 섹션 블록 (프리미엄 / TOP) ──────────────────────────────────────────────
function Section({
  type, jobs, isLoading, hideOnEmpty, onPressJob,
}: {
  type: SectionType;
  jobs: JobItem[];
  isLoading?: boolean;
  hideOnEmpty?: boolean;
  onPressJob: (job: JobItem) => void;
}) {
  if (isLoading) {
    return (
      <View style={s.sectionWrap}>
        <SectionHeader type={type} />
        {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
      </View>
    );
  }
  if (hideOnEmpty && jobs.length === 0) return null;

  return (
    <View style={s.sectionWrap}>
      <SectionHeader type={type} />
      {jobs.map((job) => <JobCard key={job.id} job={job} variant={type} onPress={onPressJob} />)}
    </View>
  );
}

// ─── 배너 캐러셀 ─────────────────────────────────────────────────────────────
function BannerCarousel() {
  const { width } = useWindowDimensions();
  const carouselWidth = width - 32; // marginHorizontal: 16 양쪽 제외
  const BANNER_HEIGHT = carouselWidth * (160 / 734); // front 배너 비율(aspect-734/160)에 맞춤
  const { data: banners } = useGetBanners();
  const [currentIdx, setCurrentIdx] = useState(0);

  if (!banners || banners.length === 0) return null;

  return (
    <View style={bn.wrap}>
      <Carousel
        width={carouselWidth}
        height={BANNER_HEIGHT}
        data={banners}
        loop={banners.length > 1}
        autoPlay={banners.length > 1}
        autoPlayInterval={5000}
        onSnapToItem={setCurrentIdx}
        // 배너 위에서 세로 스크롤이 먹히도록 — 가로 이동만 스와이프로 인정한다
        onConfigurePanGesture={(gesture) => {
          gesture.activeOffsetX([-12, 12]);
          gesture.failOffsetY([-10, 10]);
        }}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={item.linkUrl ? 0.9 : 1}
            onPress={() => item.linkUrl && Linking.openURL(item.linkUrl)}
            style={{ width: carouselWidth, height: BANNER_HEIGHT }}
          >
            <Image
              source={{ uri: getImageUrl(item.imageUrl) ?? undefined }}
              style={{ width: carouselWidth, height: BANNER_HEIGHT }}
              contentFit="cover"
            />
          </TouchableOpacity>
        )}
      />
      {banners.length > 1 && (
        <View style={bn.dots}>
          {banners.map((_, i) => (
            <View key={i} style={[bn.dot, i === currentIdx && bn.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

const bn = StyleSheet.create({
  wrap: { position: 'relative', marginHorizontal: 16, marginBottom: 4, borderRadius: 12, overflow: 'hidden', backgroundColor: '#f1f5f9' },
  dots: { position: 'absolute', bottom: 5, right: 8, flexDirection: 'row', gap: 4 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { width: 12, backgroundColor: '#fff' },
});

// ─── 메인 ─────────────────────────────────────────────────────────────────────
type SortVal = 'DEFAULT' | 'HIGH_FEE' | 'LATEST' | 'VIEW_COUNT';

type ListRow =
  | { _type: 'prelude'; id: string }
  | { _type: 'skeleton'; id: string }
  | (JobSummaryResponse & { _type: 'job' });

export default function HomePage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { requireLogin, loginPrompt } = useRequireLogin('로그인 후 구인공고를 등록할 수 있습니다.');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortVal>('LATEST');
  const [location, setLocation] = useState('전국');
  const [refreshing, setRefreshing] = useState(false);

  const { data: premiumData, isLoading: isPremiumLoading, refetch: refetchPremium } =
    useGetJobsByProduct({ product: 'PREMIUM', location, search });
  const { data: topData, isLoading: isTopLoading, refetch: refetchTop } =
    useGetJobsByProduct({ product: 'TOP', location, search });
  const {
    data: freeData, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading: isFreeLoading, refetch: refetchFree,
  } = useGetFreeJobsInfinite({ search, sort, location });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchPremium(), refetchTop(), refetchFree()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchPremium, refetchTop, refetchFree]);

  const premiumJobs = useMemo(() => (premiumData ?? []).map(toJobItem), [premiumData]);
  const topJobs = useMemo(() => (topData ?? []).map(toJobItem), [topData]);

  const listData: ListRow[] = isFreeLoading
    ? [1, 2, 3, 4].map((i) => ({ _type: 'skeleton', id: `sk-${i}` }))
    : freeData?.pages.flatMap((p) => p).map((job) => ({ ...job, _type: 'job' as const })) ?? [];

  const handlePressJob = useCallback((job: JobItem) => {
    router.push({ pathname: '/posts/site/[id]', params: { id: job.id } });
  }, [router]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // 배너/통계는 스크롤에 따라 올라가고, 검색바+지역탭은 sticky 섹션 헤더로 상단에 고정된다.
  const listHeader = useMemo(() => (
    <View>
      <BannerCarousel />
      <MainStats />
    </View>
  ), []);

  // sticky 대상 — SectionList의 섹션 헤더는 네이티브로 고정된다
  const sectionHeader = useMemo(() => (
    <View style={s.stickyHeader}>
      <SearchBar
        search={search}
        onSearchChange={setSearch}
        sort={sort}
        onSortChange={setSort}
      />
      <LocationTabs location={location} onLocationChange={setLocation} />
    </View>
  ), [search, sort, location]);

  // 프리미엄/지역TOP 캐러셀과 무료공고 헤더는 첫 번째 항목으로 넣어 함께 스크롤시킨다
  const sections = useMemo(() => [{
    data: [{ _type: 'prelude', id: 'prelude' } as ListRow, ...listData],
  }], [listData]);

  const renderItem = useCallback(({ item }: { item: ListRow }) => {
    if (item._type === 'prelude') {
      return (
        <View>
          <Section type="premium" jobs={premiumJobs} isLoading={isPremiumLoading} hideOnEmpty onPressJob={handlePressJob} />
          <Section type="top" jobs={topJobs} isLoading={isTopLoading} hideOnEmpty onPressJob={handlePressJob} />
          <View style={s.sectionWrap}>
            <SectionHeader type="free" />
          </View>
        </View>
      );
    }
    if (item._type === 'skeleton') return <View style={s.freeRow}><SkeletonCard /></View>;
    return <View style={s.freeRow}><JobCard job={toJobItem(item)} variant="free" onPress={handlePressJob} /></View>;
  }, [handlePressJob, premiumJobs, isPremiumLoading, topJobs, isTopLoading]);

  const listFooter = isFetchingNextPage ? (
    <ActivityIndicator size="large" color="#60a5fa" style={{ paddingVertical: 20 }} />
  ) : null;

  return (
    <View style={s.container}>
      <Header />
      <SectionList
        sections={sections}
        renderItem={renderItem}
        renderSectionHeader={() => sectionHeader}
        stickySectionHeadersEnabled
        keyExtractor={(item) => (item._type === 'job' ? String(item.id) : item.id)}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.6}
        contentContainerStyle={[s.listContent, { paddingBottom: insets.bottom + 88 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" colors={['#3b82f6']} />
        }
      />

      {/* 구인 등록 FAB */}
      <Fab label="구인등록" icon="create" onPress={() => requireLogin(() => router.push('/registration/sitepost'))} />
      {loginPrompt}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContent: {
    paddingBottom: 24,
  },
  // sticky 섹션 헤더 — 배경이 없으면 아래 콘텐츠가 비쳐 보인다
  stickyHeader: {
    backgroundColor: '#fff',
    paddingBottom: 4,
  },
  freeRow: {
    paddingHorizontal: 16,
  },
  sectionWrap: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 16, // rounded-2xl
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  sectionSubtitle: {
    fontSize: 9,
    fontWeight: '500',
    color: '#94a3b8',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
