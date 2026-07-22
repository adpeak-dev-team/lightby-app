import { useCallback, useState } from 'react';
import {
  View, Image, TouchableOpacity, StyleSheet,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { tokenStorage } from '@/api/apiClient';
import { useGetUnreadCount } from '@/services/notifications/queries';
import { useNotificationStream } from '@/services/notifications/useNotificationStream';
import { Colors } from '@/lib/theme';

export default function Header() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { data: unread, refetch: refetchUnread } = useGetUnreadCount(isLoggedIn);
  const unreadCount = unread?.count ?? 0;

  // 새 알림이 오면 폴링을 기다리지 않고 즉시 배지가 갱신된다
  useNotificationStream(isLoggedIn);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      tokenStorage.get().then((token) => {
        if (active) setIsLoggedIn(!!token);
      });
      // 알림함에서 읽고 돌아오거나, 다른 탭에서 알림을 받은 뒤 홈으로 돌아온 경우
      // 종 아이콘을 누르지 않아도 배지가 맞도록 화면 복귀 시마다 재조회한다.
      // (비로그인 상태에서 쏘면 401이므로 로그인 확인 후에만)
      if (isLoggedIn) refetchUnread();
      return () => { active = false; };
    }, [isLoggedIn, refetchUnread])
  );

  return (
    <View style={styles.header}>
      <Image
        source={require('@/assets/images/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      {isLoggedIn ? (
        <TouchableOpacity
          style={styles.bellBtn}
          onPress={() => router.push('/mypage/notifications')}
          activeOpacity={0.7}
          hitSlop={8}
        >
          <Ionicons name="notifications" size={24} color="#94a3b8" />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/auth/login')}>
          <Ionicons name="person-outline" size={15} color="#fff" />
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
    paddingHorizontal: 16, // px-4
    paddingTop: 12, // py-3
    paddingBottom: 12,
    marginBottom: 14,
    backgroundColor: 'rgba(255,255,255,0.95)', // bg-white/95
    borderBottomWidth: 1, // border-b border-slate-100 (그림자 대신 보더)
    borderBottomColor: Colors.border, // #f1f5f9
    width: '100%',
  },
  logo: {
    width: 100, // max-w-25
    height: 32,
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6, // gap-1.5
    backgroundColor: Colors.primary, // bg-primary-500
    paddingHorizontal: 12, // px-3
    paddingVertical: 6, // py-1.5
    borderRadius: 999, // rounded-full
    // shadow-md shadow-primary-100
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  loginText: {
    color: '#fff',
    fontWeight: '800', // font-extrabold
    fontSize: 12, // text-xs
  },
  bellBtn: {
    padding: 4,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 12,
  },
});
