import { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, Alert, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';

import Header from '@/components/common/Header';
import PreferencesForm from '@/components/common/PreferencesForm';
import { tokenStorage } from '@/api/apiClient';
import { useLogout } from '@/services/auth/mutations';
import { useGetUserProfile, useGetUserPostCount, USER_KEYS } from '@/services/user/queries';

const IMAGE_PREFIX = process.env.EXPO_PUBLIC_IMAGE_PREFIX ?? '';

type MenuItem = {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  label: string;
  badge?: 'new';
  route: string;
};

const MENU_ITEMS: MenuItem[] = [
  {
    icon: 'card',
    iconBg: '#dbeafe', iconColor: '#3b82f6',
    label: '프로필 관리',
    route: '/mypage/talent',
  },
  {
    icon: 'paper-plane',
    iconBg: '#fef9c3', iconColor: '#eab308',
    label: '지원 현황',
    route: '/mypage/application-status',
  },
  {
    icon: 'people',
    iconBg: '#dcfce7', iconColor: '#22c55e',
    label: '지원자 관리',
    badge: 'new',
    route: '/mypage/applicant-management',
  },
  {
    icon: 'help-circle',
    iconBg: '#ffedd5', iconColor: '#f97316',
    label: '고객센터',
    route: '/mypage/support',
  },
];

export default function MyPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
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
            <Text style={s.accent}>라이트바이</Text>에 로그인하시면{'\n'}
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
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* 프로필 카드 */}
        <View style={s.profileCard}>
          <View style={s.avatarWrap}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={s.avatar} />
            ) : (
              <View style={[s.avatar, s.avatarPlaceholder]}>
                <Ionicons name="person" size={32} color="#9ca3af" />
              </View>
            )}
          </View>
          <View style={s.profileInfo}>
            <Text style={s.profileName}>
              {profileLoading ? '로딩 중...' : (profile?.nickname ?? '사용자')} 님
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/mypage/account' as never)}
              activeOpacity={0.7}
            >
              <Text style={s.profileSub}>계정 설정 관리 &gt;</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={handleLogout} style={s.logoutBtn} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={20} color="#9ca3af" />
          </TouchableOpacity>
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
          {MENU_ITEMS.map(({ icon, iconBg, iconColor, label, badge, route }, idx) => (
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
              {badge === 'new' && (
                <View style={s.newBadge}>
                  <Text style={s.newBadgeText}>new</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
            </TouchableOpacity>
          ))}
        </View>

        {/* 회원 탈퇴 */}
        <View style={s.withdrawWrap}>
          <TouchableOpacity
            onPress={() => router.push('/mypage/withdraw' as never)}
            activeOpacity={0.7}
          >
            <Text style={s.withdrawText}>회원 탈퇴</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* 관심 설정 모달 */}
      <Modal
        visible={prefsVisible}
        animationType="slide"
        onRequestClose={() => setPrefsVisible(false)}
      >
        <View style={s.modalContainer}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>맞춤 정보 설정</Text>
            <TouchableOpacity onPress={() => setPrefsVisible(false)} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
          <PreferencesForm
            buttonText="저장하기"
            onComplete={() => setPrefsVisible(false)}
          />
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  scroll: { padding: 12, paddingBottom: 32, gap: 10 },

  /* 로그인 유도 */
  loginPrompt: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  iconWrap: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#fefce8',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  loginTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 10 },
  loginDesc: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
  accent: { color: '#0ea5e9', fontWeight: '700' },
  loginBtn: {
    marginTop: 28, backgroundColor: '#38bdf8',
    paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12,
  },
  loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  /* 프로필 카드 */
  profileCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  avatarWrap: { flexShrink: 0 },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  avatarPlaceholder: { backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 15, fontWeight: '800', color: '#111827' },
  profileSub: { fontSize: 13, color: '#9ca3af', marginTop: 3 },
  logoutBtn: { padding: 4 },

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
  quickTitle: { fontSize: 14, fontWeight: '700', color: '#1f2937' },
  quickSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  quickBadge: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: '#fb923c', minWidth: 20, height: 20,
    borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  quickBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

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
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  menuIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1f2937' },
  newBadge: {
    backgroundColor: '#f87171', paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 10, marginRight: 4,
  },
  newBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  /* 회원 탈퇴 */
  withdrawWrap: { alignItems: 'center', paddingTop: 4 },
  withdrawText: { fontSize: 12, color: '#9ca3af', textDecorationLine: 'underline' },

  /* 관심 설정 모달 */
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#111827' },
});
