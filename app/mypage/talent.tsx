import { useState, useEffect } from 'react';
import {
  View, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

import { useGetUserProfile } from '@/services/user/queries';
import { useSaveTalentInfo, useUploadProfileImage, useDeleteProfileImage } from '@/services/user/mutations';
import { useKeyboardVisible } from '@/hooks/use-keyboard-visible';
import { useHeaderKeyboardOffset } from '@/hooks/use-header-keyboard-offset';

const IMAGE_PREFIX = process.env.EXPO_PUBLIC_IMAGE_PREFIX ?? '';

type Gender = '남자' | '여자' | null;

export default function TalentPage() {
  const router = useRouter();
  const { data: profile, isLoading, error } = useGetUserProfile();
  const saveMutation = useSaveTalentInfo();
  const uploadImageMutation = useUploadProfileImage();
  const deleteImageMutation = useDeleteProfileImage();

  const [gender, setGender] = useState<Gender>(null);
  const [age, setAge] = useState('');
  const [introduction, setIntroduction] = useState('');
  const [careers, setCareers] = useState<string[]>([]);
  const [careerInput, setCareerInput] = useState('');
  const keyboardVisible = useKeyboardVisible();
  const [successVisible, setSuccessVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const { onHeaderLayout, keyboardVerticalOffset } = useHeaderKeyboardOffset();

  useEffect(() => {
    if (!profile) return;
    setGender(profile.gender === 'male' ? '남자' : profile.gender === 'female' ? '여자' : null);
    if (profile.birthday) {
      const birthYear = new Date(profile.birthday).getFullYear();
      setAge(String(new Date().getFullYear() - birthYear));
    }
    setIntroduction(profile.introduction ?? '');
    setCareers(profile.careers ?? []);
  }, [profile]);

  const handleAddCareer = () => {
    const trimmed = careerInput.trim();
    if (!trimmed) return;
    setCareers((prev) => [trimmed, ...prev]);
    setCareerInput('');
  };

  const handleRemoveCareer = (idx: number) => {
    setCareers((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleMoveCareer = (idx: number, dir: -1 | 1) => {
    setCareers((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const handlePickProfileImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('권한 필요', '사진 라이브러리 접근 권한이 필요합니다.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];

    try {
      const compressed = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 800 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
      );

      const formData = new FormData();
      const filename = compressed.uri.split('/').pop() ?? 'profile.jpg';
      formData.append('profile_image', {
        uri: compressed.uri,
        name: filename,
        type: 'image/jpeg',
      } as any);

      await uploadImageMutation.mutateAsync(formData);
    } catch (err) {
      console.error('[Profile] 이미지 업로드 실패:', err);
      Alert.alert('오류', '이미지 업로드에 실패했습니다.');
    }
  };

  // 프로필 사진 삭제 → 기본 프로필로
  const handleDeleteProfileImage = () => {
    Alert.alert('프로필 사진 삭제', '프로필 사진을 삭제하고 기본 프로필로 되돌릴까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteImageMutation.mutateAsync();
          } catch (err) {
            console.error('[Profile] 이미지 삭제 실패:', err);
            Alert.alert('오류', '프로필 사진 삭제에 실패했습니다.');
          }
        },
      },
    ]);
  };

  const handleSubmit = () => {
    if (!gender || !age || !introduction) {
      Alert.alert('오류', '모든 필수 정보를 입력해주세요.');
      return;
    }
    const ageNum = parseInt(age, 10);
    if (Number.isNaN(ageNum) || ageNum < 10 || ageNum > 120) {
      Alert.alert('오류', '나이를 올바르게 입력해 주세요.');
      return;
    }
    const birthYear = new Date().getFullYear() - ageNum;
    saveMutation.mutate(
      { gender, birthday: `${birthYear}-01-01`, introduction, careers },
      {
        onSuccess: (res) => {
          if (res.success) {
            setSuccessVisible(true);
          } else {
            Alert.alert('오류', '저장에 실패했습니다.');
          }
        },
        onError: () => Alert.alert('오류', '저장 중 오류가 발생했습니다.'),
      },
    );
  };

  if (isLoading) {
    return <View style={s.center}><ActivityIndicator size="large" color="#60a5fa" /></View>;
  }

  if (error) {
    return <View style={s.center}><Text style={{ color: '#f87171' }}>프로필 정보를 불러오는 데 실패했습니다.</Text></View>;
  }

  const avatarUri = profile?.profile_thumbnail
    ? `${IMAGE_PREFIX}${profile.profile_thumbnail}`
    : null;

  return (
    <View style={s.container}>
      {/* 네비게이션 */}
      <View style={s.nav} onLayout={onHeaderLayout}>
        <TouchableOpacity onPress={() => router.back()} style={s.navBack}>
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={s.navTitle}>프로필 관리</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={keyboardVerticalOffset}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 32 }, keyboardVisible && { paddingBottom: 50 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 상단 헤더 */}
          <View style={s.heroSection}>
            <Text style={s.heroTitle}>프로필 완성하기</Text>
            <Text style={s.heroSub}>
              멋진 프로필로 <Text style={s.heroAccent}>좋은 현장</Text>의 제안을 받아보세요.
            </Text>
          </View>

          {/* 프로필 사진 */}
          <View style={s.avatarSection}>
            <View style={s.avatarWrap}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={s.avatar} />
              ) : (
                <View style={[s.avatar, s.avatarPlaceholder]}>
                  <Ionicons name="person" size={40} color="#94a3b8" />
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
                  <Ionicons name="camera" size={16} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
            {!!avatarUri && (
              <TouchableOpacity
                onPress={handleDeleteProfileImage}
                disabled={deleteImageMutation.isPending}
                activeOpacity={0.7}
                hitSlop={8}
              >
                <Text style={s.avatarDelete}>
                  {deleteImageMutation.isPending ? '삭제 중...' : '기본 프로필로 되돌리기'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 기본 정보 */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View style={s.sectionBar} />
              <Text style={s.sectionTitle}>기본 정보</Text>
            </View>

            <View style={s.field}>
              <Text style={s.label}>이름</Text>
              <View style={s.readOnlyInput}>
                <Text style={s.readOnlyText}>{profile?.nickname ?? '-'}</Text>
              </View>
            </View>

            <View style={s.row}>
              <View style={[s.field, { flex: 1 }]}>
                <Text style={s.label}>성별 <Text style={s.required}>*</Text></Text>
                <View style={s.btnGroup}>
                  {(['남자', '여자'] as Gender[]).map((g) => (
                    <TouchableOpacity
                      key={g!}
                      style={[s.choiceBtn, gender === g && s.choiceBtnActive]}
                      onPress={() => setGender(g)}
                      activeOpacity={0.8}
                    >
                      <Text style={[s.choiceText, gender === g && s.choiceTextActive]}>{g}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={[s.field, { flex: 1 }]}>
                <Text style={s.label}>나이 <Text style={s.required}>*</Text></Text>
                <TextInput
                  style={s.input}
                  value={age}
                  onChangeText={(v) => setAge(v.replace(/[^0-9]/g, ''))}
                  placeholder="예: 32"
                  placeholderTextColor="#94a3b8"
                  keyboardType="number-pad"
                  maxLength={3}
                />
              </View>
            </View>
          </View>

          {/* 주요 경력 */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View style={s.sectionBar} />
              <Text style={s.sectionTitle}>주요 경력</Text>
            </View>

            <View style={s.careerInputRow}>
              <TextInput
                style={s.careerInput}
                value={careerInput}
                onChangeText={setCareerInput}
                onSubmitEditing={handleAddCareer}
                placeholder="예: OO신도시 아파트 분양 팀장 (3년)"
                placeholderTextColor="#94a3b8"
                returnKeyType="done"
              />
              <TouchableOpacity style={s.addBtn} onPress={handleAddCareer} activeOpacity={0.8}>
                <Text style={s.addBtnText}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={s.careerHint}>경력을 한 줄씩 입력 후 + 버튼을 눌러주세요. ↑↓ 버튼으로 순서를 변경할 수 있습니다.</Text>

            {careers.length > 0 && (
              <View style={s.careerList}>
                {careers.map((c, i) => (
                  <View key={i} style={s.careerItem}>
                    <View style={s.orderBtns}>
                      <TouchableOpacity
                        onPress={() => handleMoveCareer(i, -1)}
                        disabled={i === 0}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Ionicons name="chevron-up" size={16} color={i === 0 ? '#e2e8f0' : '#94a3b8'} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleMoveCareer(i, 1)}
                        disabled={i === careers.length - 1}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Ionicons name="chevron-down" size={16} color={i === careers.length - 1 ? '#e2e8f0' : '#94a3b8'} />
                      </TouchableOpacity>
                    </View>
                    <Text style={s.careerText} numberOfLines={1}>{c}</Text>
                    <TouchableOpacity onPress={() => handleRemoveCareer(i)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={s.removeBtn}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* 자기소개 */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <View style={s.sectionBar} />
              <Text style={s.sectionTitle}>자기소개 <Text style={s.required}>*</Text></Text>
            </View>
            <TextInput
              style={s.bioInput}
              value={introduction}
              onChangeText={setIntroduction}
              placeholder="자신의 강점이나 전문 분야를 자유롭게 적어주세요."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          <View style={[{ paddingBottom: keyboardVisible ? 50 : 0 }]} />

        </ScrollView>

        <View style={[s.footer, { paddingBottom: keyboardVisible ? 100 : insets.bottom }]}>
          <TouchableOpacity
            style={[s.submitBtn, saveMutation.isPending && s.btnDisabled]}
            onPress={handleSubmit}
            disabled={saveMutation.isPending}
            activeOpacity={0.85}
          >
            <Text style={s.submitText}>
              {saveMutation.isPending ? '저장 중...' : '인재 정보 등록하기 ⚡'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={successVisible} transparent animationType="fade" onRequestClose={() => setSuccessVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalIconWrap}>
              <Ionicons name="checkmark" size={36} color="#fff" />
            </View>
            <Text style={s.modalTitle}>등록 완료!</Text>
            <Text style={s.modalDesc}>
              인재 정보가 저장되었어요.{'\n'}
              <Text style={s.modalAccent}>좋은 현장의 제안</Text>을 기다려보세요!
            </Text>
            <TouchableOpacity
              style={s.modalBtn}
              onPress={() => { setSuccessVisible(false); router.back(); }}
              activeOpacity={0.85}
            >
              <Text style={s.modalBtnText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  nav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingTop: 10, paddingBottom: 10, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  navBack: { width: 40, alignItems: 'flex-start' },
  navTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },

  scroll: { padding: 16, paddingBottom: 30, gap: 12 },

  heroSection: { paddingVertical: 20, alignItems: 'center' },
  heroTitle: { fontSize: 24, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  heroSub: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20 },
  heroAccent: { color: '#3b82f6', fontWeight: '600' },

  avatarSection: { alignItems: 'center', gap: 6 },
  avatarWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarDelete: {
    fontSize: 12, color: '#94a3b8', marginTop: 10,
    textDecorationLine: 'underline',
  },
  cameraBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#60a5fa', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },

  section: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
    gap: 16,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionBar: { width: 4, height: 16, borderRadius: 2, backgroundColor: '#3b82f6' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },

  field: { gap: 6 },
  row: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 14, fontWeight: '400', color: '#334155' },
  required: { color: '#f87171' },

  readOnlyInput: {
    backgroundColor: '#f8fafc', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  readOnlyText: { fontSize: 14, color: '#64748b' },

  input: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a',
    backgroundColor: '#fff',
  },

  btnGroup: { flexDirection: 'row', gap: 8 },
  choiceBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#e2e8f0', alignItems: 'center', backgroundColor: '#f8fafc',
  },
  choiceBtnActive: { borderColor: '#3b82f6', backgroundColor: '#fff' },
  choiceText: { fontSize: 14, fontWeight: '500', color: '#94a3b8' },
  choiceTextActive: { color: '#3b82f6' },

  careerInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  careerInput: {
    flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#0f172a',
    backgroundColor: '#fff',
  },
  addBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#4ade80', alignItems: 'center', justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 20, fontWeight: '700', lineHeight: 26 },
  careerHint: { fontSize: 12, color: '#94a3b8', marginTop: -8 },
  careerList: { gap: 8 },
  careerItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
  },
  careerText: { flex: 1, fontSize: 14, color: '#334155' },
  removeBtn: { fontSize: 16, color: '#cbd5e1', marginLeft: 8 },
  orderBtns: { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginRight: 4 },

  bioInput: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
    padding: 12, fontSize: 14, color: '#0f172a', minHeight: 140,
  },

  footer: {
    paddingHorizontal: 16, paddingTop: 10,
    backgroundColor: '#f1f5f9',
    borderTopWidth: 1, borderTopColor: '#e2e8f0',
  },
  submitBtn: {
    backgroundColor: '#60a5fa', borderRadius: 16, paddingVertical: 14,
    alignItems: 'center',
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(17,24,39,0.55)',
    alignItems: 'center', justifyContent: 'center', padding: 28,
  },
  modalBox: {
    backgroundColor: '#fff', borderRadius: 24, paddingTop: 28, paddingBottom: 20, paddingHorizontal: 24,
    width: '100%', maxWidth: 340, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 24, elevation: 8,
  },
  modalIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#60a5fa', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    shadowColor: '#60a5fa', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  modalDesc: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 21, marginBottom: 22 },
  modalAccent: { color: '#3b82f6', fontWeight: '700' },
  modalBtn: {
    width: '100%', backgroundColor: '#60a5fa', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  modalBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
