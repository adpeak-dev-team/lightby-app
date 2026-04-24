import { useCallback } from 'react';
import { View, FlatList, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
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
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  list: { padding: 12, paddingBottom: 24 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 60, fontSize: 15 },
});
