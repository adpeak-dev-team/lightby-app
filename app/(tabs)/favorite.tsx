import { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import Header from '@/components/common/Header';
import { JobCard, JobItem } from '@/components/common/JobCard';
import { useGetFavoriteSitesInfinite } from '@/services/user/queries';
import { tokenStorage } from '@/api/apiClient';

type Tab = 'regions' | 'likes';

const TABS: { key: Tab; label: string }[] = [
  { key: 'regions', label: '관심 지역' },
  { key: 'likes', label: '찜한 목록' },
];

export default function FavoritePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('regions');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      tokenStorage.get().then((token: string | null) => {
        if (active) setIsLoggedIn(!!token);
      });
      return () => { active = false; };
    }, [])
  );

  const {
    data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage,
  } = useGetFavoriteSitesInfinite(activeTab, { enabled: isLoggedIn === true });

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

  const emptyText =
    activeTab === 'regions' ? '관심 지역에 해당하는 공고가 없습니다.' : '찜한 목록이 없습니다.';

  if (isLoggedIn === false) {
    return (
      <View style={s.container}>
        <Header />
        <View style={s.loginPrompt}>
          <View style={s.iconWrap}>
            <Ionicons name="heart" size={40} color="#fbbf24" />
          </View>
          <Text style={s.loginTitle}>로그인이 필요합니다</Text>
          <Text style={s.loginDesc}>
            로그인 후 <Text style={s.accent}>관심 지역</Text> 맞춤 공고와{'\n'}
            <Text style={s.accent}>찜한 목록</Text>을 한눈에 확인해 보세요.
          </Text>
          <TouchableOpacity style={s.loginBtn} onPress={() => router.push('/auth/login')} activeOpacity={0.85}>
            <Text style={s.loginBtnText}>로그인하러 가기</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color="#38bdf8" style={{ marginTop: 60 }} />
          ) : error ? (
            <Text style={s.errorText}>데이터를 불러오지 못했습니다.</Text>
          ) : (
            <Text style={s.emptyText}>{emptyText}</Text>
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator size="large" color="#38bdf8" style={{ paddingVertical: 20 }} />
          ) : null
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },

  /* 로그인 유도 */
  loginPrompt: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  iconWrap: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#fefce8',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  loginTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 10 },
  loginDesc: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
  accent: { color: '#0ea5e9', fontWeight: '700' },
  loginBtn: {
    marginTop: 28, backgroundColor: '#38bdf8', paddingHorizontal: 32, paddingVertical: 12,
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
  list: { padding: 12, paddingBottom: 24 },
  emptyText: { textAlign: 'center', color: '#9ca3af', marginTop: 60, fontSize: 14 },
  errorText: { textAlign: 'center', color: '#f87171', marginTop: 60, fontSize: 14 },
});
