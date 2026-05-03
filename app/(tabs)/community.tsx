import { useCallback } from 'react';
import { View, FlatList, ActivityIndicator, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Header from '@/components/common/Header';
import { CommunityCard } from '@/components/common/CommunityCard';
import { useGetCommunityPosts } from '@/services/community/queries';

export default function CommunityPage() {
  const router = useRouter();
  const { data: posts = [], isLoading, refetch } = useGetCommunityPosts();

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  return (
    <View style={s.container}>
      <Header />
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
            <Text style={s.empty}>게시글이 없습니다.</Text>
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
  container: { flex: 1, backgroundColor: '#f9fafb' },
  list: { padding: 12, paddingBottom: 96 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 60, fontSize: 15 },
  fab: {
    position: 'absolute', right: 16, bottom: 24,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#3b82f6', paddingHorizontal: 18, paddingVertical: 14,
    borderRadius: 999,
    shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
