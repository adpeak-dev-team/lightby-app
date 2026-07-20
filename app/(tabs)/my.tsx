import { useCallback, useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet, Image, Alert, Modal,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';

import Header from '@/components/common/Header';
import PreferencesForm from '@/components/common/PreferencesForm';
import { Colors } from '@/lib/theme';
import { tokenStorage } from '@/api/apiClient';
import { useLogout } from '@/services/auth/mutations';
import { useGetUserProfile, useGetUserPostCount, USER_KEYS } from '@/services/user/queries';
import { useGetMyJobPostings } from '@/services/site/queries';
import { useGetUnreadCount } from '@/services/notifications/queries';

const IMAGE_PREFIX = process.env.EXPO_PUBLIC_IMAGE_PREFIX ?? '';

type MenuItem = {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  label: string;
  route: string;
};

const MENU_ITEMS: MenuItem[] = [
  {
    icon: 'settings',
    iconBg: '#dbeafe', iconColor: '#3b82f6',
    label: '설정 관리',
    route: '/mypage/settings',
  },
  {
    icon: 'paper-plane',
    iconBg: '#fef9c3', iconColor: '#eab308',
    label: '내 지원 현황',
    route: '/mypage/application-status',
  },
  {
    icon: 'people',
    iconBg: '#dcfce7', iconColor: '#22c55e',
    label: '지원자 관리',
    route: '/mypage/applicant-management',
  },
  {
    icon: 'notifications',
    iconBg: '#ede9fe', iconColor: '#7c3aed',
    label: '알림 목록',
    route: '/mypage/notifications',
  },
  {
    icon: 'help-circle',
    iconBg: '#ffedd5', iconColor: '#f97316',
    label: '고객센터',
    route: '/mypage/support',
  },
  {
    // 약관 상시 접근 (App Store 1.2 — EULA 접근성)
    icon: 'document-text',
    iconBg: '#e2e8f0', iconColor: '#64748b',
    label: '약관 및 정책',
    route: '/terms',
  },
];

export default function MyPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [prefsVisible, setPrefsVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      tokenStorage.get().then((token: string | null) => {
        if (active) setIsLoggedIn(!!token);
      });
      return () => { active = false; };
    }, [])
  );

  const { data: profile, isLoading: profileLoading } = useGetUserProfile({
    enabled: isLoggedIn === true,
  });
  const { data: postCount } = useGetUserPostCount({
    enabled: isLoggedIn === true,
  });
  const { data: jobPostings } = useGetMyJobPostings();
  const totalUnreads = (jobPostings?.items ?? []).reduce((sum, item) => sum + (item.unreads_num ?? 0), 0);
  const { data: notifUnread } = useGetUnreadCount(isLoggedIn === true);
  const notifUnreadCount = notifUnread?.count ?? 0;

  const logoutMutation = useLogout();

  const handleLogout = useCallback(() => {
    Alert.alert('로그아웃', '로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          await logoutMutation.mutateAsync();
          queryClient.removeQueries({ queryKey: USER_KEYS.profile });
          queryClient.removeQueries({ queryKey: USER_KEYS.postCount });
          setIsLoggedIn(false);
        },
      },
    ]);
  }, [logoutMutation, queryClient]);

  if (isLoggedIn === false) {
    return (
      <View style={s.container}>
        <Header />
        <View style={s.loginPrompt}>
          <View style={s.iconWrap}>
            <Ionicons name="flash" size={40} color="#fbbf24" />
          </View>
          <Text style={s.loginTitle}>로그인이 필요합니다</Text>
          <Text style={s.loginDesc}>
            <Text style={s.accent}>번개분양</Text>에 로그인하시면{'\n'}
            맞춤 현장 추천부터 내 공고 관리까지{'\n'}
            모든 기능을 즉시 이용할 수 있습니다.
          </Text>
          <TouchableOpacity
            style={s.loginBtn}
            onPress={() => router.push('/auth/login')}
            activeOpacity={0.85}
          >
            <Text style={s.loginBtnText}>로그인하러 가기</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const avatarUri = profile?.profile_thumbnail
    ? `${IMAGE_PREFIX}${profile.profile_thumbnail}`
    : null;

  return (
    <View style={s.container}>
      <Header />
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 88 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 프로필 카드 */}
        <View style={s.profileCard}>
          <View style={s.avatarWrap}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={s.avatar} />
            ) : (
              <View style={[s.avatar, s.avatarPlaceholder]}>
                <Ionicons name="person" size={32} color="#94a3b8" />
              </View>
            )}
          </View>
          <View style={s.profileInfo}>
            <Text style={s.profileName}>
              {profileLoading ? '로딩 중...' : (profile?.nickname ?? '사용자')} 님
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/mypage/talent' as never)}
              activeOpacity={0.7}
            >
              <Text style={s.profileSub}>프로필 관리 &gt;</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 퀵 액션 */}
        <View style={s.quickGrid}>
          {/* 관심 설정 */}
          <TouchableOpacity
            style={s.quickCard}
            onPress={() => setPrefsVisible(true)}
            activeOpacity={0.85}
          >
            <View style={[s.quickIcon, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="settings" size={22} color="#3b82f6" />
            </View>
            <Text style={s.quickTitle}>관심 설정</Text>
            <Text style={s.quickSub}>맞춤 정보 수신</Text>
          </TouchableOpacity>

          {/* 내 글 관리 */}
          <TouchableOpacity
            style={s.quickCard}
            onPress={() => router.push('/mypage/post' as never)}
            activeOpacity={0.85}
          >
            {(postCount?.total ?? 0) > 0 && (
              <View style={s.quickBadge}>
                <Text style={s.quickBadgeText}>{postCount!.total}</Text>
              </View>
            )}
            <View style={[s.quickIcon, { backgroundColor: '#ffedd5' }]}>
              <Ionicons name="document-text" size={22} color="#f97316" />
            </View>
            <Text style={s.quickTitle}>내 글 관리</Text>
            <Text style={s.quickSub}>등록한 글 확인</Text>
          </TouchableOpacity>
        </View>

        {/* 메뉴 리스트 */}
        <View style={s.menuCard}>
          {MENU_ITEMS.map(({ icon, iconBg, iconColor, label, route }, idx) => (
            <TouchableOpacity
              key={label}
              style={[s.menuItem, idx < MENU_ITEMS.length - 1 && s.menuItemBorder]}
              onPress={() => router.push(route as never)}
              activeOpacity={0.75}
            >
              <View style={[s.menuIcon, { backgroundColor: iconBg }]}>
                <Ionicons name={icon} size={18} color={iconColor} />
              </View>
              <Text style={s.menuLabel}>{label}</Text>
              {label === '지원자 관리' && totalUnreads > 0 && (
                <View style={s.newBadge}>
                  <Text style={s.newBadgeText}>new</Text>
                </View>
              )}
              {label === '알림 목록' && notifUnreadCount > 0 && (
                <View style={s.countBadge}>
                  <Text style={s.countBadgeText}>{notifUnreadCount > 99 ? '99+' : notifUnreadCount}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
            </TouchableOpacity>
          ))}
        </View>

        {/* 로그아웃 (마이페이지 최하단) */}
        <TouchableOpacity style={s.bottomLogout} onPress={handleLogout} activeOpacity={0.75}>
          <Ionicons name="log-out-outline" size={18} color="#94a3b8" />
          <Text style={s.bottomLogoutText}>로그아웃</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 관심 설정 모달 */}
      <Modal
        visible={prefsVisible}
        animationType="slide"
        onRequestClose={() => setPrefsVisible(false)}
      >
        {/* RN Modal은 루트 SafeAreaProvider 밖에 떠서 insets가 0이 되므로
            모달 내부에 자체 SafeAreaProvider를 둬서 노치/상태바 영역을 확보한다 */}
        <SafeAreaProvider>
          <SafeAreaView style={s.modalContainer} edges={['top']}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>맞춤 정보 설정</Text>
              <TouchableOpacity onPress={() => setPrefsVisible(false)} activeOpacity={0.7} hitSlop={10}>
                <Ionicons name="close" size={24} color="#334155" />
              </TouchableOpacity>
            </View>
            <PreferencesForm
              buttonText="관심 설정 저장"
              onComplete={() => setPrefsVisible(false)}
            />
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgGray },
  scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32, gap: 10 },

  /* 로그인 유도 */
  loginPrompt: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  iconWrap: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#fefce8',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  loginTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  loginDesc: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22 },
  accent: { color: '#3b82f6', fontWeight: '700' },
  loginBtn: {
    marginTop: 28, backgroundColor: '#60a5fa',
    paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12,
  },
  loginBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },

  /* 프로필 카드 */
  profileCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  avatarWrap: { flexShrink: 0 },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  avatarPlaceholder: { backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  profileSub: { fontSize: 14, color: '#94a3b8', marginTop: 3 },
  bottomLogout: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: 16, paddingVertical: 16, marginTop: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  bottomLogoutText: { fontSize: 15, fontWeight: '600', color: '#94a3b8' },

  /* 퀵 액션 */
  quickGrid: { flexDirection: 'row', gap: 10 },
  quickCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  quickIcon: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  quickTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  quickSub: { fontSize: 14, color: '#94a3b8', marginTop: 2 },
  quickBadge: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: '#fb923c', minWidth: 20, height: 20,
    borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  quickBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  /* 메뉴 */
  menuCard: {
    backgroundColor: '#fff', borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  menuIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontSize: 16, fontWeight: '500', color: '#1e293b' },
  newBadge: {
    backgroundColor: '#f87171', paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 10, marginRight: 4,
  },
  newBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  countBadge: {
    backgroundColor: '#ef4444', minWidth: 20, height: 20, borderRadius: 10,
    paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', marginRight: 4,
  },
  countBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  /* 관심 설정 모달 */
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
});
