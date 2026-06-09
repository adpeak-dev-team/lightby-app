import { useCallback, useState } from 'react';
import {
  View, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, Modal, RefreshControl,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';

import Header from '@/components/common/Header';
import PreferencesForm from '@/components/common/PreferencesForm';
import { JobCard, JobItem } from '@/components/common/JobCard';
import { Fab } from '@/components/common/Fab';
import { useGetFavoriteSitesInfinite, useGetPreferences } from '@/services/user/queries';
import { tokenStorage } from '@/api/apiClient';
import { Colors } from '@/lib/theme';

type Tab = 'regions' | 'likes';

const TABS: { key: Tab; label: string }[] = [
  { key: 'regions', label: '맞춤 현장' },
  { key: 'likes', label: '찜한 목록' },
];

export default function FavoritePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('regions');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [prefsVisible, setPrefsVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      tokenStorage.get().then((token: string | null) => {
        if (active) setIsLoggedIn(!!token);
      });
      return () => { active = false; };
    }, [])
  );

  // 관심(맞춤) 설정 여부 — 관심 지역·업종·직종 중 하나라도 있으면 맞춤 현장이 노출됨
  const { data: preferences, isLoading: prefLoading } = useGetPreferences({ enabled: isLoggedIn === true });
  const hasPreferences =
    (preferences?.userWorkRegions?.length ?? 0) > 0 ||
    (preferences?.industries?.length ?? 0) > 0 ||
    (preferences?.jobCategories?.length ?? 0) > 0;

  const {
    data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage, refetch,
  } = useGetFavoriteSitesInfinite(activeTab, { enabled: isLoggedIn === true });

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);

  const rawSites = data?.pages.flatMap((p) => p) ?? [];
  const seen = new Set<number>();
  const sites = rawSites.filter((s) => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handlePressJob = useCallback((job: JobItem) => {
    router.push({ pathname: '/posts/site/[id]', params: { id: job.id } });
  }, [router]);

  // ── 미로그인 ──
  if (isLoggedIn === false) {
    return (
      <View style={s.container}>
        <Header />
        <View style={s.loginPrompt}>
          <View style={s.iconWrap}>
            <Ionicons name="flash" size={40} color="#facc15" />
          </View>
          <Text style={s.loginTitle}>로그인이 필요합니다</Text>
          <Text style={s.loginDesc}>
            로그인 후 <Text style={s.accent}>맞춤 현장</Text> 맞춤 공고와{'\n'}
            <Text style={s.accent}>찜한 목록</Text>을 한눈에 확인해 보세요.
          </Text>
          <TouchableOpacity style={s.loginBtn} onPress={() => router.push('/auth/login')} activeOpacity={0.85}>
            <Text style={s.loginBtnText}>로그인하러 가기</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── 리스트 헤더: 맞춤 현장 + 관심설정 완료 시 "관심 설정" 버튼 ──
  const ListHeader =
    activeTab === 'regions' && hasPreferences ? (
      <View style={s.prefBtnRow}>
        <TouchableOpacity style={s.prefBtn} onPress={() => setPrefsVisible(true)} activeOpacity={0.85}>
          <Ionicons name="settings" size={13} color="#fff" />
          <Text style={s.prefBtnText}>관심 설정</Text>
        </TouchableOpacity>
      </View>
    ) : null;

  // ── 빈 상태 ──
  const EmptyView = isLoading ? (
    <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 60 }} />
  ) : error ? (
    <Text style={s.errorText}>데이터를 불러오지 못했습니다.</Text>
  ) : activeTab === 'regions' && !hasPreferences && !prefLoading ? (
    // 관심 설정을 안 한 경우 — 설정 안내 + 버튼
    <View style={s.setupBox}>
      <View style={s.setupIcon}>
        <Ionicons name="settings" size={28} color={Colors.primary} />
      </View>
      <Text style={s.setupTitle}>관심 설정이 필요합니다</Text>
      <Text style={s.setupDesc}>
        관심 지역·직무를 설정하면{'\n'}나에게 맞는 현장을 모아서 보여드려요.
      </Text>
      <TouchableOpacity style={s.setupBtn} onPress={() => setPrefsVisible(true)} activeOpacity={0.85}>
        <Text style={s.setupBtnText}>관심 설정하기</Text>
      </TouchableOpacity>
    </View>
  ) : (
    <Text style={s.emptyText}>
      {activeTab === 'regions' ? '맞춤 현장에 해당하는 공고가 없습니다.' : '찜한 목록이 없습니다.'}
    </Text>
  );

  return (
    <View style={s.container}>
      <Header />

      {/* 탭 */}
      <View style={s.tabBar}>
        {TABS.map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={s.tabItem}
            onPress={() => setActiveTab(key)}
            activeOpacity={0.8}
          >
            <Text style={[s.tabLabel, activeTab === key && s.tabLabelActive]}>{label}</Text>
            <View style={[s.tabUnderline, activeTab === key && s.tabUnderlineActive]} />
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={sites}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <JobCard job={item} onPress={handlePressJob} />}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0ea5e9" colors={['#0ea5e9']} />
        }
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={EmptyView}
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ paddingVertical: 20 }} />
          ) : null
        }
      />

      {/* 구인 등록 FAB (front 관심현장 화면과 동일) */}
      <Fab label="구인등록" icon="create" onPress={() => router.push('/registration/sitepost')} />

      {/* 관심 설정 모달 */}
      <Modal visible={prefsVisible} animationType="slide" onRequestClose={() => setPrefsVisible(false)}>
        <View style={[s.modalContainer, { paddingTop: insets.top }]}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>관심 설정</Text>
            <TouchableOpacity onPress={() => setPrefsVisible(false)} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
          <PreferencesForm
            buttonText="관심 설정 저장"
            onComplete={() => {
              setPrefsVisible(false);
              queryClient.invalidateQueries({ queryKey: ['user-preferences'] });
              queryClient.invalidateQueries({ queryKey: ['favorite-sites'] });
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  /* 로그인 유도 */
  loginPrompt: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  iconWrap: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#fefce8',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  loginTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 10 },
  loginDesc: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
  accent: { color: '#0ea5e9', fontWeight: '700' },
  loginBtn: {
    marginTop: 28, backgroundColor: Colors.primary, paddingHorizontal: 32, paddingVertical: 12,
    borderRadius: 12,
  },
  loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  /* 탭 */
  tabBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  tabItem: { flex: 1, alignItems: 'center', paddingTop: 12, paddingBottom: 0 },
  tabLabel: { fontSize: 14, fontWeight: '600', color: '#9ca3af', paddingBottom: 10 },
  tabLabelActive: { color: '#111827' },
  tabUnderline: { height: 2, width: '100%', backgroundColor: 'transparent' },
  tabUnderlineActive: { backgroundColor: '#111827' },

  /* 리스트 */
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 96, flexGrow: 1 },
  emptyText: { textAlign: 'center', color: '#9ca3af', marginTop: 60, fontSize: 14 },
  errorText: { textAlign: 'center', color: '#f87171', marginTop: 60, fontSize: 14 },

  /* 관심 설정 버튼 (맞춤 현장 우상단) */
  prefBtnRow: { alignItems: 'flex-end', marginBottom: 12 },
  prefBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
  },
  prefBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  /* 관심 설정 필요 안내 */
  setupBox: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 16 },
  setupIcon: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#e0f2fe',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  setupTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 },
  setupDesc: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  setupBtn: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  setupBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  /* 모달 */
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
});
