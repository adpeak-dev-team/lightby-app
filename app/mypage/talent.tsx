import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useGetUserProfile } from '@/services/user/queries';
import { useSaveTalentInfo } from '@/services/user/mutations';

const IMAGE_PREFIX = process.env.EXPO_PUBLIC_IMAGE_PREFIX ?? '';

type Gender = '남자' | '여자' | null;

export default function TalentPage() {
  const router = useRouter();
  const { data: profile, isLoading, error } = useGetUserProfile();
  const saveMutation = useSaveTalentInfo();

  const [gender, setGender] = useState<Gender>(null);
  const [age, setAge] = useState('');
  const [introduction, setIntroduction] = useState('');
  const [careers, setCareers] = useState<string[]>([]);
  const [careerInput, setCareerInput] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const { Keyboard } = require('react-native');
    const show = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
      console.log('[Keyboard] 열림');
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
      console.log('[Keyboard] 닫힘');
    });
    return () => { show.remove(); hide.remove(); };
  }, []);

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

  const handleSubmit = () => {
    if (!gender || !age || !introduction) {
      Alert.alert('오류', '모든 필수 정보를 입력해주세요.');
      return;
    }
    const birthYear = new Date().getFullYear() - parseInt(age);
    saveMutation.mutate(
      { gender, birthday: `${birthYear}-01-01`, introduction, careers },
      {
        onSuccess: (res) => {
          if (res.success) {
            Alert.alert('완료', '인재 정보가 저장되었습니다! 🎉', [{ text: '확인', onPress: () => router.back() }]);
          } else {
            Alert.alert('오류', '저장에 실패했습니다.');
          }
        },
        onError: () => Alert.alert('오류', '저장 중 오류가 발생했습니다.'),
      }
    );
  };

  if (isLoading) {
    return <View style={s.center}><ActivityIndicator size="large" color="#38bdf8" /></View>;
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
      <View style={s.nav}>
        <TouchableOpacity onPress={() => router.back()} style={s.navBack}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={s.navTitle}>프로필 관리</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[s.scroll, keyboardVisible && { paddingBottom: 50 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
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
            </View>
            <Text style={s.avatarHint}>신뢰감을 줄 수 있는 깔끔한 사진을 권장해요!</Text>
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
            <Text style={s.careerHint}>경력을 한 줄씩 입력 후 + 버튼을 눌러주세요.</Text>

            {careers.length > 0 && (
              <View style={s.careerList}>
                {careers.map((c, i) => (
                  <View key={i} style={s.careerItem}>
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

          <View style={[{ paddingBottom: keyboardVisible ? 50 : 0 }]}></View>



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
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  nav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingTop: 40, paddingBottom: 10, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  navBack: { width: 40, alignItems: 'flex-start' },
  navTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },

  scroll: { padding: 16, paddingBottom: 30, gap: 12 },

  /* 상단 헤더 */
  heroSection: { paddingVertical: 20, alignItems: 'center' },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 8 },
  heroSub: { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  heroAccent: { color: '#3b82f6', fontWeight: '600' },

  /* 프로필 사진 */
  avatarSection: { alignItems: 'center', gap: 10 },
  avatarWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: {},
  avatarHint: { fontSize: 12, color: '#9ca3af' },

  /* 섹션 */
  section: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
    gap: 16,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionBar: { width: 4, height: 16, borderRadius: 2, backgroundColor: '#3b82f6' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1f2937' },

  field: { gap: 6 },
  row: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151' },
  required: { color: '#f87171' },

  readOnlyInput: {
    backgroundColor: '#f9fafb', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  readOnlyText: { fontSize: 14, color: '#6b7280' },

  input: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827',
    backgroundColor: '#fff',
  },

  btnGroup: { flexDirection: 'row', gap: 8 },
  choiceBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#e5e7eb', alignItems: 'center', backgroundColor: '#f9fafb',
  },
  choiceBtnActive: { borderColor: '#3b82f6', backgroundColor: '#fff' },
  choiceText: { fontSize: 14, fontWeight: '600', color: '#9ca3af' },
  choiceTextActive: { color: '#3b82f6' },

  /* 경력 */
  careerInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  careerInput: {
    flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827',
    backgroundColor: '#fff',
  },
  addBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#4ade80', alignItems: 'center', justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 26 },
  careerHint: { fontSize: 11, color: '#9ca3af', marginTop: -8 },
  careerList: { gap: 8 },
  careerItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#f9fafb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
  },
  careerText: { flex: 1, fontSize: 13, color: '#374151' },
  removeBtn: { fontSize: 14, color: '#d1d5db', marginLeft: 8 },

  /* 자기소개 */
  bioInput: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    padding: 12, fontSize: 14, color: '#111827', minHeight: 140,
  },

  footer: {
    paddingHorizontal: 16, paddingTop: 10,
    backgroundColor: '#f3f4f6',
    borderTopWidth: 1, borderTopColor: '#e5e7eb',
  },
  submitBtn: {
    backgroundColor: '#60a5fa', borderRadius: 16, paddingVertical: 14,
    alignItems: 'center',
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  btnDisabled: { opacity: 0.6 },
});
