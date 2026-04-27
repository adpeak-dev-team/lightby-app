import { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList, View, Text, StyleSheet, ActivityIndicator, Animated, TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import Header from '@/components/common/Header';
import SearchBar from '@/components/main/SearchBar';
import LocationTabs from '@/components/main/LocationTabs';
import { JobCard, JobItem } from '@/components/common/JobCard';
import { useGetJobsByProduct, useGetFreeJobsInfinite } from '@/services/site/queries';
import { JobSummaryResponse } from '@/services/site/types';

// ─── 타입 변환 ─────────────────────────────────────────────────────────────────
function toJobItem(job: JobSummaryResponse): JobItem {
  let icons: number[] = [];
  try { icons = job.icons ? JSON.parse(job.icons) : []; } catch { icons = []; }
  return {
    id: job.id,
    thumbnail: job.thumbnail ?? '',
    point: job.point_content ?? '',
    title: job.title,
    feeType: job.feeType ?? '',
    fee: `${job.fee.toLocaleString()}만원`,
    tags: [
      ...(Array.isArray(job.industries) ? job.industries : []),
      ...(Array.isArray(job.jobCategories) ? job.jobCategories : []),
    ].filter(Boolean),
    icons,
  };
}

// ─── 섹션 설정 ─────────────────────────────────────────────────────────────────
type SectionType = 'premium' | 'top' | 'free';
const SECTION_CONFIG: Record<SectionType, {
  title: string; subtitle: string;
  icon: keyof typeof Ionicons.glyphMap; iconBg: string; iconColor: string;
}> = {
  premium: { title: '프리미엄 현장', subtitle: 'ADPEAK PREMIUM', icon: 'star', iconBg: '#fef3c7', iconColor: '#d97706' },
  top: { title: '우리동네 TOP', subtitle: 'LOCAL BEST', icon: 'trophy', iconBg: '#dbeafe', iconColor: '#2563eb' },
  free: { title: '신규 일반 공고', subtitle: 'LATEST JOBS', icon: 'list', iconBg: '#f3f4f6', iconColor: '#4b5563' },
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
  card: { flexDirection: 'row', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#f3f4f6' },
  thumb: { width: 84, height: 84, borderRadius: 10, backgroundColor: '#e5e7eb' },
  content: { flex: 1, gap: 8, justifyContent: 'center' },
  line1: { width: 80, height: 10, backgroundColor: '#e5e7eb', borderRadius: 5 },
  line2: { width: '90%', height: 14, backgroundColor: '#e5e7eb', borderRadius: 5 },
  line3: { width: 70, height: 12, backgroundColor: '#e5e7eb', borderRadius: 5 },
  line4: { width: 100, height: 10, backgroundColor: '#e5e7eb', borderRadius: 5 },
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
      {jobs.map((job) => <JobCard key={job.id} job={job} onPress={onPressJob} />)}
    </View>
  );
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────
type SortVal = 'DEFAULT' | 'HIGH_FEE' | 'LATEST' | 'VIEW_COUNT';

type ListRow =
  | { _type: 'skeleton'; id: string }
  | (JobSummaryResponse & { _type: 'job' });

export default function HomePage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortVal>('LATEST');
  const [location, setLocation] = useState('전국');

  const { data: premiumData, isLoading: isPremiumLoading } =
    useGetJobsByProduct({ product: 'PREMIUM' });
  const { data: topData, isLoading: isTopLoading } =
    useGetJobsByProduct({ product: 'TOP', location });
  const {
    data: freeData, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading: isFreeLoading,
  } = useGetFreeJobsInfinite({ search, sort, location });

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

  const listHeader = useMemo(() => (
    <View>
      <SearchBar
        search={search}
        onSearchChange={setSearch}
        sort={sort}
        onSortChange={setSort}
      />
      <LocationTabs location={location} onLocationChange={setLocation} />
      <Section type="premium" jobs={premiumJobs} isLoading={isPremiumLoading} hideOnEmpty onPressJob={handlePressJob} />
      <Section type="top" jobs={topJobs} isLoading={isTopLoading} hideOnEmpty onPressJob={handlePressJob} />
      <View style={s.sectionWrap}>
        <SectionHeader type="free" />
      </View>
    </View>
  ), [search, sort, location, premiumJobs, isPremiumLoading, topJobs, isTopLoading, handlePressJob]);

  const renderItem = useCallback(({ item }: { item: ListRow }) => {
    if (item._type === 'skeleton') return <SkeletonCard />;
    return <JobCard job={toJobItem(item)} onPress={handlePressJob} />;
  }, [handlePressJob]);

  const listFooter = isFetchingNextPage ? (
    <ActivityIndicator size="large" color="#38bdf8" style={{ paddingVertical: 20 }} />
  ) : null;

  return (
    <View style={s.container}>
      <Header />
      <FlatList
        data={listData}
        renderItem={renderItem}
        keyExtractor={(item) => item._type === 'skeleton' ? item.id : String(item.id)}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.6}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* 공고 등록 FAB */}
      <TouchableOpacity
        style={s.fab}
        onPress={() => router.push('/registration/sitepost')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  listContent: {
    paddingBottom: 24,
  },
  sectionWrap: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
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
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  sectionSubtitle: {
    fontSize: 9,
    fontWeight: '600',
    color: '#9ca3af',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
