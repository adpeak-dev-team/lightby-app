import { useCallback, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { tokenStorage } from '@/api/apiClient';
import { useLogout } from '@/services/auth/mutations';

export default function Header() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const logoutMutation = useLogout();

  useFocusEffect(
    useCallback(() => {
      let active = true;
      tokenStorage.get().then((token) => {
        if (active) setIsLoggedIn(!!token);
      });
      return () => { active = false; };
    }, [])
  );

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSettled: () => {
        setIsLoggedIn(false);
        router.replace('/auth/login');
      },
    });
  };

  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <Image
        source={require('@/assets/images/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      {isLoggedIn ? (
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={15} color="#64748b" />
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/auth/login')}>
          <Ionicons name="log-in-outline" size={15} color="#fff" />
          <Text style={styles.loginText}>로그인</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 4,
    width: '100%',
  },
  logo: {
    width: 100,
    height: 32,
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#38bdf8',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
  },
  loginText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dbeafe',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
  },
  logoutText: {
    color: '#64748b',
    fontWeight: '700',
    fontSize: 13,
  },
});
