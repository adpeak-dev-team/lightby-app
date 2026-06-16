import { useState, useEffect, useCallback } from 'react';
import {
  View, ScrollView, TouchableOpacity, TextInput, StyleSheet, Image, ActivityIndicator, Alert,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

import { useGetUserProfile } from '@/services/user/queries';
import {
  useUpdateNickname, useSendPhoneAuthCode, useVerifyPhoneAuthCode, useChangePassword, useUploadProfileImage,
} from '@/services/user/mutations';

const IMAGE_PREFIX = process.env.EXPO_PUBLIC_IMAGE_PREFIX ?? '';

type EditField = 'nickname' | 'phone' | 'password' | null;

export default function AccountPage() {
  const router = useRouter();
  const { data: profile, isLoading, refetch } = useGetUserProfile();

  const updateNicknameMutation = useUpdateNickname();
  const sendCodeMutation = useSendPhoneAuthCode();
  const verifyCodeMutation = useVerifyPhoneAuthCode();
  const changePasswordMutation = useChangePassword();
  const uploadImageMutation = useUploadProfileImage();

  const handlePickProfileImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('권한 필요', '사진 라이브러리 접근 권한이 필요합니다.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], quality: 1, allowsEditing: true, aspect: [1, 1],
    });
    if (result.canceled || !result.assets?.[0]) return;
    try {
      const compressed = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
      );
      const formData = new FormData();
      const filename = compressed.uri.split('/').pop() ?? 'profile.jpg';
      formData.append('profile_image', { uri: compressed.uri, name: filename, type: 'image/jpeg' } as any);
      await uploadImageMutation.mutateAsync(formData);
      refetch();
    } catch (err) {
      console.error('[Account] 이미지 업로드 실패:', err);
      Alert.alert('오류', '이미지 업로드에 실패했습니다.');
    }
  };

  const [editingField, setEditingField] = useState<EditField>(null);

  const [newNickname, setNewNickname] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [authCodeSent, setAuthCodeSent] = useState(false);
  const [timer, setTimer] = useState(0);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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
    setNewNickname(''); setNewPhone(''); setAuthCode('');
    setAuthCodeSent(false); setTimer(0);
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
  }, []);

  const handleNicknameChange = async () => {
    if (!newNickname.trim()) { Alert.alert('오류', '닉네임을 입력해주세요.'); return; }
    try {
      const res = await updateNicknameMutation.mutateAsync(newNickname);
      Alert.alert('완료', res.message);
      refetch();
      handleCancel();
    } catch (e: any) {
      Alert.alert('오류', e.response?.data?.message || '닉네임 변경 실패');
    }
  };

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

  const avatarUri = profile?.profile_thumbnail ? `${IMAGE_PREFIX}${profile.profile_thumbnail}` : null;
  const timerLabel = `${Math.floor(timer / 60)}:${String(timer % 60).padStart(2, '0')}`;

  return (
    <View style={s.container}>
      {/* 네비 */}
      <View style={s.nav}>
        <TouchableOpacity onPress={() => router.back()} style={s.navBack}>
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={s.navTitle}>계정 설정</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* 아바타 */}
        <View style={s.avatarSection}>
          <View style={s.avatarWrap}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={s.avatar} />
            ) : (
              <View style={[s.avatar, s.avatarPlaceholder]}>
                <Ionicons name="person" size={36} color="#94a3b8" />
              </View>
            )}
            <TouchableOpacity
              style={s.cameraBtn}
              onPress={handlePickProfileImage}
              disabled={uploadImageMutation.isPending}
              activeOpacity={0.8}
            >
              {uploadImageMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="camera" size={14} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
          <Text style={s.avatarHint}>카메라 버튼 클릭 후 이미지를 선택하시면 프로필 이미지가 변경됩니다.</Text>
          <Text style={s.avatarName}>{profile?.nickname ?? '사용자'} 님</Text>
        </View>

        {/* 정보 카드 */}
        <View style={s.card}>
          {/* 아이디 */}
          <View style={s.row}>
            <Text style={s.label}>아이디</Text>
            <Text style={s.value}>{profile?.id ?? '-'}</Text>
          </View>

          {/* 로그인 ID / SNS */}
          <View style={s.row}>
            <Text style={s.label}>{profile?.sns_type === 'local' ? '로그인 ID' : 'SNS'}</Text>
            <Text style={s.value}>
              {profile?.sns_type === 'local' ? (profile?.login_id ?? '-') : (profile?.sns_type ?? '-')}
            </Text>
          </View>

          {/* 닉네임 */}
          <View style={[s.row, s.rowBig]}>
            <View style={s.rowHeader}>
              <Text style={s.label}>닉네임</Text>
              {editingField !== 'nickname' && (
                <TouchableOpacity onPress={() => { setEditingField('nickname'); setNewNickname(profile?.nickname ?? ''); }}>
                  <Text style={s.changeBtn}>변경하기</Text>
                </TouchableOpacity>
              )}
            </View>
            {editingField === 'nickname' ? (
              <View style={s.editWrap}>
                <View style={s.inputRow}>
                  <TextInput
                    style={s.input}
                    value={newNickname}
                    onChangeText={setNewNickname}
                    placeholder="새 닉네임 입력"
                    placeholderTextColor="#94a3b8"
                  />
                  <TouchableOpacity
                    style={[s.actionBtn, updateNicknameMutation.isPending && s.btnDisabled]}
                    onPress={handleNicknameChange}
                    disabled={updateNicknameMutation.isPending}
                  >
                    <Text style={s.actionBtnText}>{updateNicknameMutation.isPending ? '변경 중...' : '변경'}</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={s.cancelBtn} onPress={handleCancel}>
                  <Text style={s.cancelBtnText}>취소</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={s.value}>{profile?.nickname ?? '-'}</Text>
            )}
          </View>

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

        <Text style={s.footer}>
          회원정보는 개인정보 처리방침에 따라 안전하게 보호되며,{'\n'}정보 변경 시 즉시 서비스에 반영됩니다.
        </Text>

        {/* 회원 탈퇴 (front처럼 계정 설정 하단에 위치) */}
        <TouchableOpacity
          style={s.withdrawWrap}
          onPress={() => router.push('/mypage/withdraw' as never)}
          activeOpacity={0.7}
        >
          <Text style={s.withdrawText}>회원 탈퇴</Text>
        </TouchableOpacity>
      </ScrollView>
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
  avatarSection: { alignItems: 'center', paddingVertical: 24 },
  avatarWrap: { marginBottom: 10, position: 'relative' },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarPlaceholder: { backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#f1f5f9',
  },
  avatarHint: { fontSize: 12, color: '#60a5fa', textAlign: 'center', marginBottom: 6 },
  avatarName: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
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
  footer: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 20, lineHeight: 18 },
  withdrawWrap: { alignItems: 'center', marginTop: 24 },
  withdrawText: { fontSize: 12, color: '#94a3b8', textDecorationLine: 'underline' },
});
