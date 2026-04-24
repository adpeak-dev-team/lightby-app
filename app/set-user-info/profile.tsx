import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { toast } from '@/hooks/use-toast';


import { useGetUserProfile } from '@/services/user/queries';
import { useSaveTalentInfo } from '@/services/user/mutations';

const CAREER_OPTIONS = [
  '주방보조', '홀서빙', '주방장', '매니저', '바리스타',
  '제과제빵', '청소', '배달', '창고', '공사현장', '기타',
];

type Gender = '남자' | '여자' | null;

export default function SetUserInfoProfilePage() {
  const router = useRouter();
  const { data: profile, isLoading, error } = useGetUserProfile();
  const saveMutation = useSaveTalentInfo();

  const [gender, setGender] = useState<Gender>(null);
  const [age, setAge] = useState('');
  const [introduction, setIntroduction] = useState('');
  const [careers, setCareers] = useState<string[]>([]);

  useEffect(() => {
    if (!profile) return;
    setGender(profile.gender === 'male' ? '남자' : profile.gender === 'female' ? '여자' : null);
    if (profile.birthday) {
      setAge(String(new Date().getFullYear() - new Date(profile.birthday).getFullYear()));
    }
    setIntroduction(profile.introduction ?? '');
    setCareers(profile.careers ?? []);
  }, [profile]);

  const toggleCareer = (c: string) => {
    setCareers((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
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
            toast.success('라이트바이를 시작합니다. ⚡');
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

  return (
    <View style={s.container}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 기본 정보 */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>기본 정보</Text>

          <View style={s.field}>
            <Text style={s.label}>이름</Text>
            <View style={s.readOnlyInput}>
              <Text style={s.readOnlyText}>{profile?.nickname ?? '-'}</Text>
            </View>
          </View>

          <View style={s.field}>
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

          <View style={s.field}>
            <Text style={s.label}>나이 <Text style={s.required}>*</Text></Text>
            <View style={s.ageRow}>
              <TextInput
                style={s.ageInput}
                value={age}
                onChangeText={(v) => setAge(v.replace(/[^0-9]/g, ''))}
                placeholder="예) 35"
                placeholderTextColor="#9ca3af"
                keyboardType="number-pad"
                maxLength={3}
              />
              <Text style={s.ageSuffix}>세</Text>
            </View>
          </View>
        </View>

        {/* 경력 */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>경력</Text>
          <Text style={s.sectionSub}>해당되는 경력을 모두 선택해 주세요.</Text>
          <View style={s.careerGrid}>
            {CAREER_OPTIONS.map((opt) => {
              const selected = careers.includes(opt);
              return (
                <TouchableOpacity
                  key={opt}
                  style={[s.careerChip, selected && s.careerChipActive]}
                  onPress={() => toggleCareer(opt)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.careerText, selected && s.careerTextActive]}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 자기소개 */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>자기소개 <Text style={s.required}>*</Text></Text>
          <TextInput
            style={s.bioInput}
            value={introduction}
            onChangeText={setIntroduction}
            placeholder="간단한 자기소개를 작성해 주세요."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
          <Text style={s.charCount}>{introduction.length}자</Text>
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
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#f87171', fontSize: 14 },
  scroll: { padding: 16, paddingTop: 40, paddingBottom: 40, gap: 12 },

  section: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
    gap: 14,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#111827' },
  sectionSub: { fontSize: 12, color: '#9ca3af', marginTop: -8 },

  field: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151' },
  required: { color: '#f87171' },

  readOnlyInput: { backgroundColor: '#f9fafb', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  readOnlyText: { fontSize: 14, color: '#6b7280' },

  btnGroup: { flexDirection: 'row', gap: 10 },
  choiceBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#e5e7eb', alignItems: 'center', backgroundColor: '#fff',
  },
  choiceBtnActive: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  choiceText: { fontSize: 14, fontWeight: '600', color: '#9ca3af' },
  choiceTextActive: { color: '#3b82f6' },

  ageRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ageInput: {
    width: 80, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827',
  },
  ageSuffix: { fontSize: 14, color: '#6b7280' },

  careerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  careerChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fff',
  },
  careerChipActive: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  careerText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  careerTextActive: { color: '#3b82f6' },

  bioInput: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    padding: 12, fontSize: 14, color: '#111827', minHeight: 120,
  },
  charCount: { textAlign: 'right', fontSize: 11, color: '#9ca3af' },

  submitBtn: { backgroundColor: '#3b82f6', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  btnDisabled: { opacity: 0.6 },

  skipBtn: { alignItems: 'center', paddingVertical: 14 },
  skipText: { fontSize: 14, color: '#9ca3af' },
});
