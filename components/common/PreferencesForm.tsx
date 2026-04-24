import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';

import { regions, industries, roles } from '@/lib/constants';
import { useGetPreferences } from '@/services/user/queries';
import { useSavePreferences } from '@/services/user/mutations';

interface PreferencesFormProps {
  onComplete?: () => void;
  buttonText?: string;
}

export default function PreferencesForm({ onComplete, buttonText = '저장' }: PreferencesFormProps) {
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

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
    saveMutation.mutate(
      { industryCodes: selectedIndustries, roleCodes: selectedRoles, regionCodes: selectedRegions },
      { onSuccess: () => onComplete?.() },
    );
  };

  if (isLoading) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={s.loadingText}>선호도 정보를 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={s.scroll}
      showsVerticalScrollIndicator={false}
    >
      {/* 희망 근무 지역 */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>🌐 희망 근무 지역</Text>
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
        <Text style={s.sectionTitle}>🗂️ 관심 업종</Text>
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
      </View>

      {/* 나의 역할 (직종) */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>🔒 나의 역할(직종)</Text>
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

const TEAL = '#007595';

const s = StyleSheet.create({
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 60 },
  loadingText: { fontSize: 14, color: '#9ca3af' },

  scroll: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },

  section: { marginBottom: 36 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1f2937', marginBottom: 14 },
  hint: { fontSize: 11, color: '#9ca3af', marginTop: 8 },

  regionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  regionChip: {
    width: '31%', paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#fff', alignItems: 'center',
  },
  regionChipActive: { backgroundColor: TEAL, borderColor: TEAL },
  regionText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  regionTextActive: { color: '#fff' },

  industryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  industryChip: {
    width: '48%', flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#fff',
  },
  industryChipActive: { borderColor: TEAL, backgroundColor: `${TEAL}18` },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#d1d5db' },
  dotActive: { backgroundColor: TEAL },
  industryText: { fontSize: 13, color: '#374151', flex: 1 },
  industryTextActive: { color: TEAL, fontWeight: '700' },

  rolesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleChip: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#d1d5db', backgroundColor: '#fff',
  },
  roleChipActive: { backgroundColor: '#1f2937', borderColor: '#1f2937' },
  roleText: { fontSize: 13, color: '#6b7280' },
  roleTextActive: { color: '#fff', fontWeight: '700' },

  saveBtn: {
    backgroundColor: '#38bdf8', borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  btnDisabled: { opacity: 0.6 },
});
