import { useCallback, useState } from 'react';
import {
  View, FlatList, ActivityIndicator, Text, StyleSheet,
  TouchableOpacity, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Header from '@/components/common/Header';
import { CommunityCard } from '@/components/common/CommunityCard';
import { useGetCommunityPosts } from '@/services/community/queries';

export default function CommunityPage() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');

  const { data: posts = [], isLoading, refetch } = useGetCommunityPosts(search);

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
            <Ionicons name="arrow-forward-circle" size={20} color="#3b82f6" />
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
            onPress={() => router.push({ pathname: '/posts/board/[id]', params: { id: item.id } })}
          />
        )}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color="#38bdf8" style={{ marginTop: 60 }} />
          ) : (
            <Text style={s.empty}>
              {search ? `"${search}" 검색 결과가 없습니다.` : '게시글이 없습니다.'}
            </Text>
          )
        }
      />

      <TouchableOpacity
        style={s.fab}
        onPress={() => router.push('/registration/communitypost')}
        activeOpacity={0.85}
      >
        <Ionicons name="create-outline" size={20} color="#fff" />
        <Text style={s.fabText}>글쓰기</Text>
      </TouchableOpacity>
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
  fab: {
    position: 'absolute', right: 16, bottom: 24,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#3b82f6', paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 999,
    shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
