import { useCallback, useState } from 'react';
import {
  View, FlatList, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGetNotifications, useGetUnreadCount } from '@/services/notifications/queries';
import { useMarkNotificationAsRead, useMarkAllNotificationsAsRead } from '@/services/notifications/mutations';
import {
  CATEGORY_LABELS, NOTIFICATION_CATEGORIES,
  type NotificationCategory, type NotificationItem,
} from '@/services/notifications/types';

// 탭 목록 — '전체' + 4개 카테고리. undefined = 전체
const TABS: { key: NotificationCategory | 'all'; label: string }[] = [
  { key: 'all', label: '전체' },
  ...NOTIFICATION_CATEGORIES.map((c) => ({ key: c, label: CATEGORY_LABELS[c] })),
];

// 알림 종류별 아이콘/색상
function iconFor(type: string): { icon: keyof typeof Ionicons.glyphMap; bg: string; color: string } {
  switch (type) {
    case 'matched_digest':
      return { icon: 'star', bg: '#fef9c3', color: '#ca8a04' };
    case 'new_sites':
      return { icon: 'location', bg: '#dcfce7', color: '#16a34a' };
    case 'weekly_popular':
      return { icon: 'flame', bg: '#fee2e2', color: '#dc2626' };
    case 'deadline_owner':
    case 'deadline_liker':
    case 'deadline_owner_group':
    case 'deadline_liker_group':
      return { icon: 'time', bg: '#fee2e2', color: '#e11d48' };
    case 'low_exposure':
      return { icon: 'trending-down', bg: '#e0f2fe', color: '#0284c7' };
    case 'inactive':
      return { icon: 'sparkles', bg: '#f3e8ff', color: '#7c3aed' };
    case 'profile_incomplete':
      return { icon: 'person-circle', bg: '#dbeafe', color: '#2563eb' };
    case 'community_comment':
      return { icon: 'chatbubble-ellipses', bg: '#e0e7ff', color: '#4f46e5' };
    case 'apply_complete':
      return { icon: 'paper-plane', bg: '#fef9c3', color: '#ca8a04' };
    case 'new_applicant':
    case 'applicants_pending':
      return { icon: 'people', bg: '#dcfce7', color: '#16a34a' };
    case 'profile_viewed':
      return { icon: 'eye', bg: '#e0f2fe', color: '#0284c7' };
    case 'site_liked_milestone':
      return { icon: 'heart', bg: '#fee2e2', color: '#dc2626' };
    default:
      return { icon: 'notifications', bg: '#f1f5f9', color: '#64748b' };
  }
}

function timeAgo(iso: string): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diff = now - t;
  // 미래 시각(서버/DB 시간대 불일치, 기기 시계 오차)은 '방금'으로 표시.
  // 예전엔 Math.max(0, ...)로 뭉개서 9시간 어긋난 값도 조용히 '방금'이 됐다.
  if (diff < 0) return '방금';
  const min = Math.floor(diff / 60_000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function NotificationsPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<NotificationCategory | 'all'>('all');

  const { data: unreadCounts } = useGetUnreadCount();
  const {
    data, isLoading, refetch, fetchNextPage, hasNextPage, isFetchingNextPage,
  } = useGetNotifications(true, tab === 'all' ? undefined : tab);
  const items: NotificationItem[] = data?.pages.flatMap((p) => p) ?? [];

  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();

  const hasUnread = items.some((n) => !n.readAt);

  const handlePress = useCallback((n: NotificationItem) => {
    if (!n.readAt) markAsRead.mutate(n.id);

    // 라우팅은 [useNotificationObserver.ts routeFromData]와 일치시킨다.
    const siteId = n.data?.siteId;
    const boardId = n.data?.boardId;
    switch (n.type) {
      // 커뮤니티
      case 'community_comment':
        if (boardId) router.push({ pathname: '/posts/board/[id]', params: { id: String(boardId) } });
        return;

      // 지원 관련
      case 'apply_complete':
        router.push('/mypage/application-status' as never);
        return;
      case 'new_applicant':
      case 'applicants_pending':
        router.push('/mypage/applicant-management' as never);
        return;
      case 'profile_viewed':
        router.push('/mypage/application-status' as never);
        return;
      case 'site_liked_milestone':
        if (siteId) router.push({ pathname: '/posts/site/[id]', params: { id: String(siteId) } });
        return;

      // 예약 발송 (인박스 표시)
      case 'matched_digest':
      case 'deadline_liker':
      case 'deadline_liker_group':
        router.push('/(tabs)/favorite' as never);
        return;
      case 'deadline_owner':
      case 'deadline_owner_group':
        router.push('/mypage/post' as never);
        return;
      case 'profile_incomplete':
        router.push('/mypage/talent' as never);
        return;

      // inactive 등은 홈으로
      default:
        router.push('/' as never);
        return;
    }
  }, [router, markAsRead]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const { icon, bg, color } = iconFor(item.type);
    const unread = !item.readAt;
    return (
      <TouchableOpacity
        style={[s.item, unread && s.itemUnread]}
        onPress={() => handlePress(item)}
        activeOpacity={0.7}
      >
        <View style={[s.iconWrap, { backgroundColor: bg }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        <View style={s.content}>
          <View style={s.titleRow}>
            <Text style={[s.title, unread && s.titleUnread]} numberOfLines={1}>{item.title}</Text>
            {unread && <View style={s.dot} />}
          </View>
          <Text style={s.body} numberOfLines={2}>{item.body}</Text>
          <Text style={s.time}>{timeAgo(item.createdAt)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      {/* 네비 */}
      <View style={s.nav}>
        <TouchableOpacity onPress={() => router.back()} style={s.navBack}>
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={s.navTitle}>알림 목록</Text>
        <TouchableOpacity
          onPress={() => markAllAsRead.mutate()}
          disabled={!hasUnread || markAllAsRead.isPending}
          style={s.navRight}
          hitSlop={8}
        >
          <Text style={[s.readAllText, !hasUnread && s.readAllTextDisabled]}>모두 읽음</Text>
        </TouchableOpacity>
      </View>

      {/* 카테고리 탭 — 라벨 길이가 제각각이라 균등분할 대신 내용 크기 + 가로 스크롤 */}
      <View style={s.tabBarWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.tabBar}
          style={s.tabScroll}
        >
          {TABS.map(({ key, label }) => {
            const active = tab === key;
            const badge = key === 'all'
              ? (unreadCounts?.count ?? 0)
              : (unreadCounts?.byCategory?.[key] ?? 0);
            return (
              <TouchableOpacity
                key={key}
                style={[s.tab, active && s.tabActive]}
                onPress={() => setTab(key)}
                activeOpacity={0.85}
              >
                <Text style={[s.tabText, active && s.tabTextActive]}>{label}</Text>
                {badge > 0 && (
                  <View style={[s.tabBadge, active && s.tabBadgeActive]}>
                    <Text style={[s.tabBadgeText, active && s.tabBadgeTextActive]}>
                      {badge > 99 ? '99+' : badge}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={[items.length === 0 ? s.emptyWrap : s.list, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" colors={['#3b82f6']} />
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color="#60a5fa" />
          ) : (
            <View style={s.empty}>
              <Ionicons name="notifications-off-outline" size={48} color="#cbd5e1" />
              <Text style={s.emptyText}>받은 알림이 없습니다</Text>
            </View>
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator color="#60a5fa" style={{ paddingVertical: 20 }} />
          ) : null
        }
      />

      {/* 알림 설정 바로가기 — 우하단 고정 */}
      <TouchableOpacity
        style={[s.settingsFab, { bottom: insets.bottom + 20 }]}
        onPress={() => router.push({ pathname: '/mypage/settings', params: { section: 'notifications' } } as never)}
        activeOpacity={0.85}
        accessibilityLabel="알림 설정"
      >
        <Ionicons name="settings-outline" size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  nav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingTop: 10, paddingBottom: 12, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  navBack: { width: 60, alignItems: 'flex-start' },
  navTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  navRight: { width: 60, alignItems: 'flex-end' },
  readAllText: { fontSize: 13, color: '#3b82f6', fontWeight: '600' },
  readAllTextDisabled: { color: '#cbd5e1' },

  /* 카테고리 탭 — 목록과 같은 배경 위에 올려 경계가 생기지 않게 한다 */
  tabBarWrap: {
    backgroundColor: '#f1f5f9',
    paddingTop: 14, paddingBottom: 12,
  },
  tabScroll: { flexGrow: 0 },
  tabBar: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 16,
  },
  // 알림 설정 바로가기 (우하단 플로팅)
  settingsFab: {
    position: 'absolute', right: 16,
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#3b82f6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18, shadowRadius: 8, elevation: 6,
  },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: 999, backgroundColor: '#fff',
  },
  tabActive: { backgroundColor: '#3b82f6' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#fff' },
  tabBadge: {
    minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#ef4444',
  },
  tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.28)' },
  tabBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  tabBadgeTextActive: { color: '#fff' },

  list: { paddingHorizontal: 12, paddingTop: 0, gap: 8 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: 10 },
  emptyText: { fontSize: 14, color: '#94a3b8' },

  item: {
    flexDirection: 'row', gap: 12,
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  itemUnread: {
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  content: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 14, fontWeight: '600', color: '#334155', flex: 1 },
  titleUnread: { color: '#0f172a', fontWeight: '700' },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#ef4444' },
  body: { fontSize: 13, color: '#64748b', lineHeight: 19 },
  time: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
});
