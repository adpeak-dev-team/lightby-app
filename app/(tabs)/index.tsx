import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { apiClient, tokenStorage } from '@/api/apiClient';
import Header from '@/components/common/Header';

export default function mainTest() {

  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get('/db-test')
      .then(res => setData(res.data))
      .catch(err => {
        console.error('API 요청 실패:', err);
        setError(err.response?.data?.message || 'API 요청 중 오류가 발생했습니다.');
      });
  }, []);

  return (
    <View style={styles.container}>
      <Header onLoginPress={() => router.push('/auth/login')} />
      <View style={styles.content}>
        <Text style={styles.title}>안녕하세요, 번개분양입니다!</Text>
        <Text style={styles.title}>이곳은 메인 페이지입니다.</Text>

        <TouchableOpacity
          style={styles.debugBtn}
          onPress={async () => {
            const access = await tokenStorage.get();
            const refresh = await tokenStorage.getRefresh();
            console.log('=== SecureStore ===');
            console.log('access_token:', access);
            console.log('refresh_token:', refresh);
          }}
        >
          <Text style={styles.debugBtnText}>토큰 확인</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  debugBtn: {
    marginTop: 16,
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  debugBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
