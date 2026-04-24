import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import PreferencesForm from '@/components/common/PreferencesForm';

export default function InterestPage() {
  const router = useRouter();

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>맞춤 정보를 설정할까요?</Text>
        <Text style={s.headerSub}>
          회원님께 딱 맞는 현장 소식을{'\n'}번개처럼 가장 먼저 알려드릴게요!
        </Text>
      </View>
      <PreferencesForm
        buttonText="다음"
        onComplete={() => router.push('/set-user-info/profile' as never)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingTop: 64, paddingHorizontal: 24, paddingBottom: 28, alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 10, textAlign: 'center' },
  headerSub: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
});
