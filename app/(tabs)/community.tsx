import { View, Text, StyleSheet } from 'react-native';
import Header from '@/components/common/Header';
import { useRouter } from 'expo-router';

export default function CommunityPage() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Header onLoginPress={() => router.push('/auth/login')} />
      <View style={styles.content}>
        <Text style={styles.text}>현장소통</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 20, fontWeight: 'bold', color: '#374151' },
});
