import { useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { tokenStorage } from '@/api/apiClient';
import { useWithdrawUser } from '@/services/user/mutations';
import { Colors } from '@/lib/theme';

// 탈퇴 시 안내 사항 (front 기준)
const WITHDRAW_NOTICES = [
  '탈퇴 시 계정 정보 및 프로필이 삭제되며 복구할 수 없습니다.',
  '작성하신 구인 공고와 게시글, 댓글은 삭제되거나 비공개 처리될 수 있습니다.',
  '찜한 목록·관심 설정 등 맞춤 정보가 모두 사라집니다.',
  '탈퇴 후 동일한 정보로 재가입하더라도 기존 데이터는 복구되지 않습니다.',
];

export default function WithdrawPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { mutate: withdraw, isPending } = useWithdrawUser();

  const [agreed, setAgreed] = useState(false);

  // 실제 탈퇴 처리 — 성공 시 토큰/캐시 정리 후 로그인 화면으로 이동
  const handleWithdraw = () => {
    withdraw(undefined, {
      onSuccess: async () => {
        await tokenStorage.clearAll();
        queryClient.clear();
        Alert.alert('탈퇴 완료', '회원 탈퇴가 완료되었습니다.', [
          { text: '확인', onPress: () => router.replace('/auth/login') },
        ]);
      },
      onError: () => {
        Alert.alert('오류', '회원 탈퇴에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      },
    });
  };

  const confirmWithdraw = () => {
    Alert.alert(
      '회원 탈퇴',
      '탈퇴 시 모든 정보가 삭제되며 복구할 수 없습니다. 정말 탈퇴하시겠습니까?',
      [
        { text: '계속 이용하기', style: 'cancel' },
        { text: '탈퇴하기', style: 'destructive', onPress: handleWithdraw },
      ],
    );
  };

  return (
    <View style={s.container}>
      {/* 네비 */}
      <View style={s.nav}>
        <TouchableOpacity onPress={() => router.back()} style={s.navBack} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={s.navTitle}>회원 탈퇴</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* 상단 안내 */}
        <View style={s.headerBox}>
          <View style={s.warnIcon}>
            <Ionicons name="alert-circle-outline" size={32} color="#f87171" />
          </View>
          <Text style={s.title}>정말 탈퇴하시겠어요?</Text>
          <Text style={s.subtitle}>
            탈퇴하기 전에 아래 안내 사항을{'\n'}반드시 확인해 주세요.
          </Text>
        </View>

        {/* 안내 사항 */}
        <View style={s.noticeCard}>
          {WITHDRAW_NOTICES.map((notice, i) => (
            <View key={i} style={s.noticeRow}>
              <View style={s.dot} />
              <Text style={s.noticeText}>{notice}</Text>
            </View>
          ))}
        </View>

        {/* 동의 체크박스 */}
        <TouchableOpacity style={s.agreeRow} onPress={() => setAgreed((v) => !v)} activeOpacity={0.7}>
          <Ionicons
            name={agreed ? 'checkbox' : 'square-outline'}
            size={20}
            color={agreed ? '#ef4444' : '#94a3b8'}
          />
          <Text style={s.agreeText}>안내 사항을 모두 확인했으며, 탈퇴에 동의합니다.</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 하단 탈퇴 버튼 */}
      <View style={[s.footer, { paddingBottom: insets.bottom || 16 }]}>
        <TouchableOpacity
          style={[s.withdrawBtn, (!agreed || isPending) && s.withdrawBtnDisabled]}
          onPress={confirmWithdraw}
          disabled={!agreed || isPending}
          activeOpacity={0.85}
        >
          <Text style={[s.withdrawBtnText, (!agreed || isPending) && s.withdrawBtnTextDisabled]}>
            {isPending ? '탈퇴 처리 중...' : '회원 탈퇴'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgGray },
  nav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingTop: 10, paddingBottom: 12, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  navBack: { width: 40, alignItems: 'flex-start' },
  navTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  scroll: { padding: 24, paddingTop: 32 },

  headerBox: { alignItems: 'center', marginBottom: 28 },
  warnIcon: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: '#fef2f2',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 21 },

  noticeCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  noticeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fca5a5', marginTop: 7 },
  noticeText: { flex: 1, fontSize: 14, color: '#475569', lineHeight: 21 },

  agreeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24 },
  agreeText: { flex: 1, fontSize: 14, color: '#334155' },

  footer: {
    backgroundColor: Colors.bgGray, paddingHorizontal: 24, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  withdrawBtn: {
    paddingVertical: 16, borderRadius: 16, backgroundColor: '#ef4444', alignItems: 'center',
  },
  withdrawBtnDisabled: { backgroundColor: '#e2e8f0' },
  withdrawBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  withdrawBtnTextDisabled: { color: '#94a3b8' },
});
