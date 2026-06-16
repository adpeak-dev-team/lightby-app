import { useCallback, useEffect, useState } from 'react';
import {
  View, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity, TextInput, RefreshControl,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Header from '@/components/common/Header';
import { CommunityCard } from '@/components/common/CommunityCard';
import { Fab } from '@/components/common/Fab';
import { useGetCommunityPosts } from '@/services/community/queries';
import { useGetMe } from '@/services/auth/queries';
import { useRequireLogin } from '@/hooks/use-require-login';
import { COMMUNITY_TABS, CommunityCategory } from '@/lib/communityCategory';

export default function CommunityPage() {
  const router = useRouter();
  const { requireLogin, loginPrompt } = useRequireLogin('로그인 후 현장소통을 이용할 수 있습니다.');
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [focused, setFocused] = useState(false);
  const [tab, setTab] = useState<'all' | CommunityCategory>('all');

  // me(로그인 정보)가 확정된 뒤에 피드를 불러와야 차단 필터(viewerId)가 빠진 결과가 캐시되지 않는다
  const { data: me, isLoading: meLoading } = useGetMe();
  const {
    data, isLoading, refetch, fetchNextPage, hasNextPage, isFetchingNextPage,
  } = useGetCommunityPosts(search, tab === 'all' ? undefined : tab, me?.id, !meLoading);

  // 여러 페이지를 하나의 배열로 평탄화
  const posts = data?.pages.flatMap((p) => p.data) ?? [];

  // 입력하는 대로 실시간 검색 (300ms 디바운스) — front 동일
  useEffect(() => {
    const timer = setTimeout(() => setSearch(input.trim()), 300);
    return () => clearTimeout(timer);
  }, [input]);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const handleSubmit = () => {
    setSearch(input.trim());
  };

  const handleClear = () => {
    setInput('');
    setSearch('');
  };

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);

  return (
    <View style={s.container}>
      <Header />

      {/* 카테고리 탭 (전체/공지/뉴스) + 검색창 */}
      <View style={s.searchWrap}>
        {/* 오늘의 영업운 진입 버튼 */}
        <TouchableOpacity activeOpacity={0.9} onPress={() => router.push('/fortune')}>
          <LinearGradient
            colors={['#fdf2f8', '#fefce8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.fortuneBtn}
          >
            <Text style={s.fortuneEmoji}>🔮</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.fortuneTitle}>오늘의 영업운</Text>
              <Text style={s.fortuneSub}>띠를 선택하고 오늘의 운세를 확인하세요</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748b" />
          </LinearGradient>
        </TouchableOpacity>

        <View style={s.tabs}>
          {COMMUNITY_TABS.map((t) => {
            const active = tab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[s.tab, active && s.tabActive]}
                onPress={() => setTab(t.key)}
                activeOpacity={0.85}
              >
                <Text style={[s.tabText, active && s.tabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={[s.searchBar, focused && s.searchBarFocused]}>
          <Ionicons name="search-outline" size={16} color="#94a3b8" />
          <TextInput
            style={s.searchInput}
            value={input}
            onChangeText={setInput}
            placeholder="제목 또는 내용으로 검색"
            placeholderTextColor="#94a3b8"
            returnKeyType="search"
            onSubmitEditing={handleSubmit}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {!!input && (
            <TouchableOpacity onPress={handleClear} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
        {!!search && (
          <Text style={s.searchResult}>
            <Text style={s.searchKeyword}>"{search}"</Text> 검색 결과 {posts.length}건
          </Text>
        )}
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <CommunityCard
            item={item}
            onPress={() => requireLogin(() => router.push({ pathname: '/posts/board/[id]', params: { id: item.id } }))}
          />
        )}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" colors={['#3b82f6']} />
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color="#60a5fa" style={{ marginTop: 60 }} />
          ) : (
            <Text style={s.empty}>
              {search ? `"${search}" 검색 결과가 없습니다.` : '게시글이 없습니다.'}
            </Text>
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator color="#60a5fa" style={{ paddingVertical: 20 }} />
          ) : !hasNextPage && posts.length > 0 ? (
            <Text style={s.endText}>마지막 게시글입니다.</Text>
          ) : null
        }
      />

      <Fab label="게시글 등록" icon="create" onPress={() => requireLogin(() => router.push('/registration/communitypost'))} />
      {loginPrompt}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  searchWrap: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 8,
  },
  // 오늘의 영업운 버튼 (핑크→옐로 그라데)
  fortuneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12, // rounded-xl
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  fortuneEmoji: { fontSize: 24 },
  fortuneTitle: { fontSize: 14, fontWeight: '700', color: '#334155' },
  fortuneSub: { fontSize: 12, color: '#64748b' },
  // 카테고리 탭
  tabs: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16, // px-4
    paddingVertical: 6, // py-1.5
    borderRadius: 999, // rounded-full
    backgroundColor: '#f8fafc', // bg-slate-50
  },
  tabActive: {
    backgroundColor: '#3b82f6', // bg-primary-500
  },
  tabText: {
    fontSize: 14, // text-sm
    fontWeight: '600', // font-semibold
    color: '#64748b', // slate-500
  },
  tabTextActive: {
    color: '#fff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc', // bg-slate-50
    borderRadius: 16, // rounded-2xl
    paddingHorizontal: 16, // px-4
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: 'transparent', // 기본: border-transparent
  },
  searchBarFocused: {
    borderColor: '#3b82f6', // border-primary-500
    backgroundColor: '#fff',
    // shadow-xl
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b', // text-slate-800
    padding: 0,
  },
  searchResult: { fontSize: 12, color: '#94a3b8', paddingHorizontal: 2 },
  searchKeyword: { fontWeight: '600', color: '#334155' },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 96 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 60, fontSize: 14 },
  endText: { textAlign: 'center', color: '#cbd5e1', fontSize: 12, paddingVertical: 16 },
});
