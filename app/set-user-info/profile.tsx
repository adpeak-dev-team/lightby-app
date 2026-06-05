import { useState, useEffect } from 'react';
import {
  View, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert, Image,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { toast } from '@/hooks/use-toast';

import { useGetUserProfile } from '@/services/user/queries';
import { useSaveTalentInfo, useUploadProfileImage } from '@/services/user/mutations';

const IMAGE_PREFIX = process.env.EXPO_PUBLIC_IMAGE_PREFIX ?? '';

type Gender = '남자' | '여자' | null;

export default function SetUserInfoProfilePage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: profile, isLoading, error } = useGetUserProfile();
  const saveMutation = useSaveTalentInfo();
  const uploadImageMutation = useUploadProfileImage();

  const [gender, setGender] = useState<Gender>(null);
  const [age, setAge] = useState('');
  const [introduction, setIntroduction] = useState('');
  const [careers, setCareers] = useState<string[]>([]);
  const [careerInput, setCareerInput] = useState('');

  useEffect(() => {
    if (!profile) return;
    setGender(profile.gender === 'male' ? '남자' : profile.gender === 'female' ? '여자' : null);
    if (profile.birthday) {
      setAge(String(new Date().getFullYear() - new Date(profile.birthday).getFullYear()));
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
  const handleRemoveCareer = (idx: number) => setCareers((prev) => prev.filter((_, i) => i !== idx));
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
    } catch (err) {
      console.error('[Profile] 이미지 업로드 실패:', err);
      Alert.alert('오류', '이미지 업로드에 실패했습니다.');
    }
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
            toast.success('번개분양을 시작합니다. ⚡');
            router.replace('/');
          } else {
            Alert.alert('오류', '저장에 실패했습니다.');
          }
        },
        onError: () => Alert.alert('오류', '저장 중 오류가 발생했습니다.'),
      }
    );
  };

  const handleSkip = () => {
    toast.info('프로필 정보는 마이페이지에서 언제든지 변경 가능합니다.');
    router.replace('/');
  };

  if (isLoading) {
    return <View style={s.center}><ActivityIndicator size="large" color="#38bdf8" /></View>;
  }
  if (error) {
    return <View style={s.center}><Text style={s.errorText}>프로필 정보를 불러오는 데 실패했습니다.</Text></View>;
  }

  const avatarUri = profile?.profile_thumbnail ? `${IMAGE_PREFIX}${profile.profile_thumbnail}` : null;

  return (
    <View style={s.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* 상단 헤더 */}
          <View style={s.heroSection}>
            <Text style={s.heroTitle}>프로필 완성하기</Text>
            <Text style={s.heroSub}>
              시행사, 본부장님이 회원님을 기다리고 있어요!{'\n'}
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
                  <Ionicons name="person" size={40} color="#9ca3af" />
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
            <Text style={s.avatarHint}>신뢰감을 줄 수 있는 깔끔한 사진을 권장해요!</Text>
            <Text style={s.avatarSubHint}>카메라 버튼 클릭 후 이미지를 선택하면 프로필 이미지가 변경됩니다.</Text>
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
                  placeholderTextColor="#9ca3af"
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
                placeholderTextColor="#9ca3af"
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
                      <TouchableOpacity onPress={() => handleMoveCareer(i, -1)} disabled={i === 0} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                        <Ionicons name="chevron-up" size={16} color={i === 0 ? '#e5e7eb' : '#9ca3af'} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleMoveCareer(i, 1)} disabled={i === careers.length - 1} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                        <Ionicons name="chevron-down" size={16} color={i === careers.length - 1 ? '#e5e7eb' : '#9ca3af'} />
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
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={[s.submitBtn, saveMutation.isPending && s.btnDisabled]}
            onPress={handleSubmit}
            disabled={saveMutation.isPending}
            activeOpacity={0.85}
          >
            <Text style={s.submitText}>
              {saveMutation.isPending ? '저장 중...' : '프로필 저장하고 시작하기 ⚡'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.skipBtn} onPress={handleSkip} activeOpacity={0.7}>
            <Text style={s.skipText}>나중에 할게요</Text>
          </TouchableOpacity>

          <View style={{ height: insets.bottom + 16 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#f87171', fontSize: 14 },
  scroll: { padding: 16, paddingTop: 32, gap: 12 },

  heroSection: { paddingVertical: 12, alignItems: 'center' },
  heroTitle: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 },
  heroSub: { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  heroAccent: { color: '#0ea5e9', fontWeight: '600' },

  avatarSection: { alignItems: 'center', gap: 6 },
  avatarWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarHint: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  avatarSubHint: { fontSize: 11, color: '#0ea5e9' },
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
  sectionBar: { width: 4, height: 16, borderRadius: 2, backgroundColor: '#0ea5e9' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937' },

  field: { gap: 6 },
  row: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151' },
  required: { color: '#f87171' },

  readOnlyInput: { backgroundColor: '#f9fafb', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  readOnlyText: { fontSize: 14, color: '#6b7280' },

  input: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827', backgroundColor: '#fff',
  },

  btnGroup: { flexDirection: 'row', gap: 8 },
  choiceBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#e5e7eb', alignItems: 'center', backgroundColor: '#f9fafb',
  },
  choiceBtnActive: { borderColor: '#0ea5e9', backgroundColor: '#fff' },
  choiceText: { fontSize: 14, fontWeight: '600', color: '#9ca3af' },
  choiceTextActive: { color: '#0ea5e9' },

  careerInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  careerInput: {
    flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827', backgroundColor: '#fff',
  },
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#4ade80', alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 26 },
  careerHint: { fontSize: 11, color: '#9ca3af', marginTop: -8 },
  careerList: { gap: 8 },
  careerItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#f9fafb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
  },
  careerText: { flex: 1, fontSize: 13, color: '#374151' },
  removeBtn: { fontSize: 14, color: '#d1d5db', marginLeft: 8 },
  orderBtns: { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginRight: 4 },

  bioInput: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    padding: 12, fontSize: 14, color: '#111827', minHeight: 140,
  },

  submitBtn: { backgroundColor: '#0ea5e9', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },

  skipBtn: { alignItems: 'center', paddingVertical: 14 },
  skipText: { fontSize: 14, color: '#9ca3af' },
});
