import { useCallback, useEffect, useState } from 'react';
import {
  View, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity, TextInput, RefreshControl,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Header from '@/components/common/Header';
import { CommunityCard } from '@/components/common/CommunityCard';
import { Fab } from '@/components/common/Fab';
import { useGetCommunityPosts } from '@/services/community/queries';
import { useRequireLogin } from '@/hooks/use-require-login';

export default function CommunityPage() {
  const router = useRouter();
  const { requireLogin, loginPrompt } = useRequireLogin('로그인 후 현장소통을 이용할 수 있습니다.');
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');

  const {
    data, isLoading, refetch, fetchNextPage, hasNextPage, isFetchingNextPage,
  } = useGetCommunityPosts(search);

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

      {/* 검색창 */}
      <View style={s.searchWrap}>
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={16} color="#9ca3af" />
          <TextInput
            style={s.searchInput}
            value={input}
            onChangeText={setInput}
            placeholder="제목 또는 내용으로 검색"
            placeholderTextColor="#9ca3af"
            returnKeyType="search"
            onSubmitEditing={handleSubmit}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {!!input && (
            <TouchableOpacity onPress={handleClear} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color="#9ca3af" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleSubmit} hitSlop={8}>
            <Ionicons name="arrow-forward-circle" size={20} color="#0ea5e9" />
          </TouchableOpacity>
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0ea5e9" colors={['#0ea5e9']} />
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color="#38bdf8" style={{ marginTop: 60 }} />
          ) : (
            <Text style={s.empty}>
              {search ? `"${search}" 검색 결과가 없습니다.` : '게시글이 없습니다.'}
            </Text>
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator color="#38bdf8" style={{ paddingVertical: 20 }} />
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 6,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    padding: 0,
  },
  searchResult: { fontSize: 11, color: '#9ca3af', paddingHorizontal: 2 },
  searchKeyword: { fontWeight: '700', color: '#374151' },
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 96 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 60, fontSize: 15 },
  endText: { textAlign: 'center', color: '#d1d5db', fontSize: 12, paddingVertical: 16 },
});
