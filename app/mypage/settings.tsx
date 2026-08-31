import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Switch,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { TextInput } from '@/components/common/AppTextInput';
import { Text } from '@/components/common/AppText';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderKeyboardOffset } from '@/hooks/use-header-keyboard-offset';

import { useGetUserProfile, useGetNotificationSettings } from '@/services/user/queries';
import {
  useSendPhoneAuthCode, useVerifyPhoneAuthCode, useChangePassword,
  useUpdateNotificationSettings,
} from '@/services/user/mutations';
import type { NotificationSettings } from '@/services/user/api';

type EditField = 'phone' | 'password' | null;

const NOTIFICATION_ITEMS: { key: keyof NotificationSettings; label: string; description: string }[] = [
  {
    key: 'push_enabled',
    label: '서비스 알림',
    description: '지원자 도착, 프로필 열람, 맞춤 공고 등 주요 알림',
  },
  {
    key: 'marketing_push_enabled',
    label: '마케팅 · 혜택 알림',
    description: '이벤트, 할인, 프로모션 소식',
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { keyboardVerticalOffset } = useHeaderKeyboardOffset();
  const { data: profile, isLoading, refetch } = useGetUserProfile();

  // 알림 목록의 설정 아이콘에서 진입하면 알림 설정 섹션으로 바로 스크롤한다
  const { section } = useLocalSearchParams<{ section?: string }>();
  const scrollRef = useRef<ScrollView>(null);
  const notiSectionY = useRef(0);
  const didAutoScroll = useRef(false);

  const sendCodeMutation = useSendPhoneAuthCode();
  const verifyCodeMutation = useVerifyPhoneAuthCode();
  const changePasswordMutation = useChangePassword();

  const [editingField, setEditingField] = useState<EditField>(null);

  const [newPhone, setNewPhone] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [authCodeSent, setAuthCodeSent] = useState(false);
  const [timer, setTimer] = useState(0);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 알림 설정 — 서버 값 기준
  const { data: notificationSettings } = useGetNotificationSettings();
  const updateNotificationSettings = useUpdateNotificationSettings();

  const handleNotificationToggle = (key: keyof NotificationSettings, checked: boolean) => {
    updateNotificationSettings.mutate(
      { [key]: checked },
      { onError: () => Alert.alert('오류', '알림 설정 저장에 실패했습니다.') },
    );
  };

  useEffect(() => {
    if (!authCodeSent) return;
    // 유효시간 만료 → 재발송 가능하도록 상태 초기화 + 안내
    if (timer <= 0) {
      setAuthCodeSent(false);
      setAuthCode('');
      Alert.alert('인증 시간 만료', '인증번호 유효시간이 지났습니다. 다시 발송해 주세요.');
      return;
    }
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer, authCodeSent]);

  const handleCancel = useCallback(() => {
    setEditingField(null);
    setNewPhone(''); setAuthCode('');
    setAuthCodeSent(false); setTimer(0);
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
  }, []);

  const handleSendCode = async () => {
    if (!newPhone.trim()) { Alert.alert('오류', '휴대폰 번호를 입력해주세요.'); return; }
    try {
      await sendCodeMutation.mutateAsync(newPhone);
      Alert.alert('완료', '인증번호가 발송되었습니다.');
      setAuthCodeSent(true);
      setTimer(180);
    } catch (e: any) {
      Alert.alert('오류', e.response?.data?.message || '인증번호 발송 실패');
    }
  };

  const handleVerifyPhone = async () => {
    if (!authCode.trim()) { Alert.alert('오류', '인증번호를 입력해주세요.'); return; }
    try {
      const res = await verifyCodeMutation.mutateAsync({ phone: newPhone, authCode });
      Alert.alert('완료', res.message);
      refetch();
      handleCancel();
    } catch (e: any) {
      Alert.alert('오류', e.response?.data?.message || '휴대폰 인증 실패');
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPassword) { Alert.alert('오류', '현재 비밀번호를 입력해주세요.'); return; }
    if (!newPassword || newPassword.length < 8) { Alert.alert('오류', '새 비밀번호는 8자 이상이어야 합니다.'); return; }
    if (newPassword !== confirmPassword) { Alert.alert('오류', '새 비밀번호가 일치하지 않습니다.'); return; }
    try {
      const res = await changePasswordMutation.mutateAsync({ currentPassword, newPassword });
      Alert.alert('완료', res.message);
      handleCancel();
    } catch (e: any) {
      Alert.alert('오류', e.response?.data?.message || '비밀번호 변경 실패');
    }
  };

  if (isLoading) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator size="large" color="#60a5fa" />
      </View>
    );
  }

  const timerLabel = `${Math.floor(timer / 60)}:${String(timer % 60).padStart(2, '0')}`;

  return (
    <View style={s.container}>
      {/* 네비 */}
      <View style={s.nav}>
        <TouchableOpacity onPress={() => router.back()} style={s.navBack}>
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={s.navTitle}>설정 관리</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* iOS 키보드 회피. automaticallyAdjustKeyboardInsets 는 이 화면 구조에서
          전혀 동작하지 않아, 앱 전반에서 검증된 KAV + keyboardVerticalOffset 방식을 쓴다. */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ───────── 계정 설정 ───────── */}
        <Text style={s.sectionTitle}>계정 설정</Text>

        {/* 정보 카드 */}
        <View style={s.card}>
          {/* 아이디 — 로컬은 login_id, 소셜은 가입 경로(kakao/apple)를 보여준다.
              (내부 PK를 노출하던 행은 제거) */}
          <View style={s.row}>
            <Text style={s.label}>{profile?.sns_type === 'local' ? '로그인 ID' : 'SNS'}</Text>
            <Text style={s.value}>
              {profile?.sns_type === 'local' ? (profile?.login_id ?? '-') : (profile?.sns_type ?? '-')}
            </Text>
          </View>

          {/* 닉네임은 프로필 관리(/mypage/talent)에서 수정한다 */}

          {/* 휴대폰 */}
          <View style={[s.row, s.rowBig]}>
            <View style={s.rowHeader}>
              <Text style={s.label}>휴대폰 번호</Text>
              {editingField !== 'phone' && (
                <TouchableOpacity onPress={() => { setEditingField('phone'); setNewPhone(''); setAuthCode(''); }}>
                  <Text style={s.changeBtn}>변경하기</Text>
                </TouchableOpacity>
              )}
            </View>
            {editingField === 'phone' ? (
              <View style={s.editWrap}>
                <View style={s.inputRow}>
                  <TextInput
                    style={[s.input, authCodeSent && s.inputDisabled]}
                    value={newPhone}
                    onChangeText={setNewPhone}
                    placeholder="휴대폰 번호 입력"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                    editable={!authCodeSent}
                  />
                  <TouchableOpacity
                    style={[s.actionBtn, (sendCodeMutation.isPending || authCodeSent) && s.btnDisabled]}
                    onPress={handleSendCode}
                    disabled={sendCodeMutation.isPending || authCodeSent}
                  >
                    <Text style={s.actionBtnText}>{authCodeSent ? '발송됨' : '발송'}</Text>
                  </TouchableOpacity>
                </View>
                {authCodeSent && (
                  <>
                    <View style={s.inputRow}>
                      <TextInput
                        style={s.input}
                        value={authCode}
                        onChangeText={setAuthCode}
                        placeholder="인증번호 입력"
                        placeholderTextColor="#94a3b8"
                        keyboardType="number-pad"
                      />
                      <TouchableOpacity
                        style={[s.actionBtn, verifyCodeMutation.isPending && s.btnDisabled]}
                        onPress={handleVerifyPhone}
                        disabled={verifyCodeMutation.isPending}
                      >
                        <Text style={s.actionBtnText}>{verifyCodeMutation.isPending ? '확인 중...' : '인증'}</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={s.timerText}>{timerLabel}</Text>
                  </>
                )}
                <TouchableOpacity style={s.cancelBtn} onPress={handleCancel}>
                  <Text style={s.cancelBtnText}>취소</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={s.value}>{profile?.phone ?? '-'}</Text>
            )}
          </View>

          {/* 비밀번호 — 로컬(이메일/아이디) 계정만 노출 (front 동일) */}
          {profile?.sns_type === 'local' && (
          <View style={[s.row, s.rowBig, { borderBottomWidth: 0 }]}>
            <View style={s.rowHeader}>
              <Text style={s.label}>비밀번호</Text>
              {editingField !== 'password' && (
                <TouchableOpacity onPress={() => { setEditingField('password'); }}>
                  <Text style={s.changeBtn}>변경하기</Text>
                </TouchableOpacity>
              )}
            </View>
            {editingField === 'password' ? (
              <View style={s.editWrap}>
                <TextInput
                  style={s.inputFull}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="현재 비밀번호"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry
                />
                <TextInput
                  style={s.inputFull}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="새 비밀번호 (8자 이상)"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry
                />
                <TextInput
                  style={s.inputFull}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="새 비밀번호 확인"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry
                />
                <View style={s.btnRow}>
                  <TouchableOpacity style={s.cancelBtn} onPress={handleCancel}>
                    <Text style={s.cancelBtnText}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.confirmBtn, changePasswordMutation.isPending && s.btnDisabled]}
                    onPress={handlePasswordChange}
                    disabled={changePasswordMutation.isPending}
                  >
                    <Text style={s.confirmBtnText}>{changePasswordMutation.isPending ? '변경 중...' : '변경 완료'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <Text style={s.value}>• • • • • • • •</Text>
            )}
          </View>
          )}
        </View>

        {/* 차단 관리 */}
        <TouchableOpacity
          style={s.linkRow}
          onPress={() => router.push('/mypage/blocked' as never)}
          activeOpacity={0.75}
        >
          <View style={[s.linkIcon, { backgroundColor: '#fee2e2' }]}>
            <Ionicons name="ban" size={18} color="#ef4444" />
          </View>
          <Text style={s.linkLabel}>차단 관리</Text>
          <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
        </TouchableOpacity>

        {/* ───────── 알림 설정 ───────── */}
        <Text
          style={[s.sectionTitle, { marginTop: 24 }]}
          onLayout={(e) => {
            notiSectionY.current = e.nativeEvent.layout.y;
            // 레이아웃 확정 후 1회만 자동 스크롤
            if (section === 'notifications' && !didAutoScroll.current) {
              didAutoScroll.current = true;
              scrollRef.current?.scrollTo({ y: Math.max(0, notiSectionY.current - 12), animated: true });
            }
          }}
        >
          알림 설정
        </Text>

        {/* 제목 바로 아래 보조 설명 */}
        <Text style={s.hint}>
          휴대폰 설정에서 알림을 꺼두시면 이 설정과 관계없이 알림이 오지 않습니다.
        </Text>

        <View style={s.card}>
          {NOTIFICATION_ITEMS.map(({ key, label, description }, idx) => {
            const value = notificationSettings?.[key] ?? false;
            const isLast = idx === NOTIFICATION_ITEMS.length - 1;
            return (
              <View key={key} style={[s.row, s.notiRow, isLast && { borderBottomWidth: 0 }]}>
                <View style={s.notiTextWrap}>
                  <Text style={s.notiLabel}>{label}</Text>
                  <Text style={s.notiDesc}>{description}</Text>
                </View>
                <Switch
                  value={value}
                  disabled={!notificationSettings || updateNotificationSettings.isPending}
                  onValueChange={(v) => handleNotificationToggle(key, v)}
                  trackColor={{ false: '#e2e8f0', true: '#93c5fd' }}
                  thumbColor={value ? '#3b82f6' : '#f8fafc'}
                />
              </View>
            );
          })}
        </View>

        <Text style={s.footer}>
          회원정보는 개인정보처리방침에 따라 안전하게 보호됩니다.
        </Text>

        {/* 회원 탈퇴 */}
        <TouchableOpacity
          style={s.withdrawWrap}
          onPress={() => router.push('/mypage/withdraw' as never)}
          activeOpacity={0.7}
        >
          <Text style={s.withdrawText}>회원 탈퇴</Text>
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  nav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingTop: 10, paddingBottom: 12, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  navBack: { width: 40, alignItems: 'flex-start' },
  navTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  scroll: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#64748b', marginBottom: 8, marginLeft: 4 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  row: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  rowBig: { paddingVertical: 14 },
  rowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  label: { fontSize: 14, color: '#94a3b8' },
  value: { fontSize: 14, fontWeight: '500', color: '#1e293b', marginTop: 3 },
  changeBtn: { fontSize: 14, color: '#3b82f6', fontWeight: '500' },
  editWrap: { gap: 8, marginTop: 8 },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a',
    backgroundColor: '#fff',
  },
  inputDisabled: { backgroundColor: '#f8fafc' },
  inputFull: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a', backgroundColor: '#fff',
  },
  actionBtn: { backgroundColor: '#3b82f6', borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
  timerText: { textAlign: 'right', fontSize: 12, color: '#ef4444', fontWeight: '600' },
  cancelBtn: {
    alignSelf: 'flex-end', backgroundColor: '#f1f5f9',
    borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8,
  },
  cancelBtnText: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  btnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
  confirmBtn: { backgroundColor: '#3b82f6', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  confirmBtnText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  linkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, marginTop: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  linkIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  linkLabel: { flex: 1, fontSize: 16, fontWeight: '500', color: '#1e293b' },

  /* 알림 설정 */
  noticeBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#fefce8', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8,
  },
  noticeText: { flex: 1, fontSize: 12, color: '#a16207', lineHeight: 18 },
  notiRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  notiTextWrap: { flex: 1 },
  notiLabel: { fontSize: 14, fontWeight: '500', color: '#1e293b' },
  notiDesc: { fontSize: 12, color: '#94a3b8', marginTop: 2, lineHeight: 18 },

  // 섹션 제목 바로 아래 보조 설명 (제목과 좌우 정렬을 맞춘다)
  hint: { fontSize: 12, color: '#94a3b8', lineHeight: 18, marginTop: -2, marginBottom: 10, marginHorizontal: 4 },
  footer: { fontSize: 12, color: '#cbd5e1', textAlign: 'center', marginTop: 28, lineHeight: 18 },
  withdrawWrap: { alignItems: 'center', marginTop: 12 },
  withdrawText: { fontSize: 12, color: '#94a3b8', textDecorationLine: 'underline' },
});
