import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { fetchSites, type Site } from '@/services/api';

export default function SitesScreen() {
  const { data: sites, isLoading, error } = useQuery({
    queryKey: ['sites'],
    queryFn: fetchSites,
  });

  if (isLoading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.center}>
        <ThemedText type="default">Failed to load sites</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.header}>Sites</ThemedText>
      <FlatList
        data={sites}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: { item: Site }) => (
          <View style={styles.item}>
            <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
            <ThemedText type="default">{item.url}</ThemedText>
            <ThemedText type="default">{item.status}</ThemedText>
          </View>
        )}
        ListEmptyComponent={<ThemedText type="default" style={styles.empty}>No sites found</ThemedText>}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 16,
  },
  item: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
    gap: 4,
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
  },
});
