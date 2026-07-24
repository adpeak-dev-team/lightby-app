import { useState, useEffect } from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { regions, industries, roles } from '@/lib/constants';
import { useGetPreferences } from '@/services/user/queries';
import { useSavePreferences } from '@/services/user/mutations';
import { toast } from '@/hooks/use-toast';

interface PreferencesFormProps {
  onComplete?: () => void;
  buttonText?: string;
}

export default function PreferencesForm({ onComplete, buttonText = '저장' }: PreferencesFormProps) {
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const insets = useSafeAreaInsets();
  const { data: preferences, isLoading } = useGetPreferences();
  const saveMutation = useSavePreferences();

  useEffect(() => {
    if (!preferences) return;
    setSelectedRegions(preferences.userWorkRegions ?? []);
    setSelectedIndustries(preferences.industries ?? []);
    setSelectedRoles(preferences.jobCategories ?? []);
  }, [preferences]);

  const toggle = <T extends string>(
    setList: React.Dispatch<React.SetStateAction<T[]>>,
    item: T,
  ) => {
    setList((prev) => prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]);
  };

  const handleSave = () => {
    // 모달 안에서 호출될 수 있어 toast(모달 뒤) 대신 Alert 사용
    if (selectedRegions.length === 0) {
      Alert.alert('알림', '근무지역은 최소 1개 이상 선택해야 합니다.');
      return;
    }
    if (selectedIndustries.length === 0) {
      Alert.alert('알림', '관심 업종은 최소 1개 이상 선택해야 합니다.');
      return;
    }
    if (selectedRoles.length === 0) {
      Alert.alert('알림', '관심 직종은 최소 1개 이상 선택해야 합니다.');
      return;
    }
    saveMutation.mutate(
      { industryCodes: selectedIndustries, roleCodes: selectedRoles, regionCodes: selectedRegions },
      {
        onSuccess: () => {
          toast.success('관심 설정이 저장되었습니다.');
          onComplete?.();
        },
        onError: () => Alert.alert('오류', '저장에 실패했습니다. 잠시 후 다시 시도해 주세요.'),
      },
    );
  };

  if (isLoading) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator size="large" color="#60a5fa" />
        <Text style={s.loadingText}>선호도 정보를 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* 희망 근무 지역 */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>🌐 희망 근무 지역 <Text style={s.required}>*</Text></Text>
        <View style={s.regionGrid}>
          {regions.map((region) => {
            const selected = selectedRegions.includes(region);
            return (
              <TouchableOpacity
                key={region}
                style={[s.regionChip, selected && s.regionChipActive]}
                onPress={() => toggle(setSelectedRegions, region)}
                activeOpacity={0.8}
              >
                <Text style={[s.regionText, selected && s.regionTextActive]}>{region}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={s.hint}>* 근무지역은 최소 1개 이상 선택해야 합니다.</Text>
      </View>

      {/* 관심 업종 */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>🗂️ 관심 업종 <Text style={s.required}>*</Text></Text>
        <View style={s.industryGrid}>
          {industries.map((industry) => {
            const selected = selectedIndustries.includes(industry);
            return (
              <TouchableOpacity
                key={industry}
                style={[s.industryChip, selected && s.industryChipActive]}
                onPress={() => toggle(setSelectedIndustries, industry)}
                activeOpacity={0.8}
              >
                <View style={[s.dot, selected && s.dotActive]} />
                <Text style={[s.industryText, selected && s.industryTextActive]}>{industry}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={s.hint}>* 관심 업종은 최소 1개 이상 선택해야 합니다.</Text>
      </View>

      {/* 나의 역할 (직종) */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>🔒 관심 직종 <Text style={s.required}>*</Text></Text>
        <View style={s.rolesWrap}>
          {roles.map((role) => {
            const selected = selectedRoles.includes(role);
            return (
              <TouchableOpacity
                key={role}
                style={[s.roleChip, selected && s.roleChipActive]}
                onPress={() => toggle(setSelectedRoles, role)}
                activeOpacity={0.8}
              >
                <Text style={[s.roleText, selected && s.roleTextActive]}># {role}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={s.hint}>* 관심 직종은 최소 1개 이상 선택해야 합니다.</Text>
      </View>

      <TouchableOpacity
        style={[s.saveBtn, saveMutation.isPending && s.btnDisabled]}
        onPress={handleSave}
        disabled={saveMutation.isPending}
        activeOpacity={0.85}
      >
        <Text style={s.saveBtnText}>{saveMutation.isPending ? '저장 중...' : buttonText}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const TEAL = '#2563eb';

const s = StyleSheet.create({
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 60 },
  loadingText: { fontSize: 16, color: '#94a3b8' },

  scroll: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },

  section: { marginBottom: 36 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 14 },
  required: { color: '#ef4444', fontWeight: '700' },
  hint: { fontSize: 12, color: '#94a3b8', marginTop: 8 },

  regionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  regionChip: {
    width: '31%', paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#fff', alignItems: 'center',
  },
  regionChipActive: { backgroundColor: TEAL, borderColor: TEAL },
  regionText: { fontSize: 14, fontWeight: '500', color: '#334155' },
  regionTextActive: { color: '#fff' },

  industryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  industryChip: {
    width: '48%', flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#fff',
  },
  industryChipActive: { borderColor: TEAL, backgroundColor: `${TEAL}18` },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#cbd5e1' },
  dotActive: { backgroundColor: TEAL },
  industryText: { fontSize: 14, color: '#334155', flex: 1 },
  industryTextActive: { color: TEAL, fontWeight: '600' },

  rolesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleChip: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#cbd5e1', backgroundColor: '#fff',
  },
  roleChipActive: { backgroundColor: '#1e293b', borderColor: '#1e293b' },
  roleText: { fontSize: 14, color: '#64748b' },
  roleTextActive: { color: '#fff', fontWeight: '600' },

  saveBtn: {
    backgroundColor: '#60a5fa', borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
});
