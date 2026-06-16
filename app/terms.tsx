import { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SERVICE_DOC, PRIVACY_DOC, type LegalDoc } from '@/lib/termsData';

type DocKey = 'service' | 'privacy';

const TABS: { key: DocKey; label: string; doc: LegalDoc }[] = [
  { key: 'service', label: '이용약관', doc: SERVICE_DOC },
  { key: 'privacy', label: '개인정보처리방침', doc: PRIVACY_DOC },
];

// 가입 화면에서 진입하는 약관 전문 화면 (App Store 가이드라인 1.2 — EULA 인앱 표시)
export default function TermsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { doc } = useLocalSearchParams<{ doc?: DocKey }>();
  const [active, setActive] = useState<DocKey>(doc === 'privacy' ? 'privacy' : 'service');

  const current = TABS.find((t) => t.key === active)!.doc;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={s.navbar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={s.navBtn}>
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={s.navTitle}>약관 및 정책</Text>
        <View style={s.navBtn} />
      </View>

      {/* 탭 */}
      <View style={s.tabs}>
        {TABS.map((t) => {
          const on = active === t.key;
          return (
            <TouchableOpacity key={t.key} style={[s.tab, on && s.tabActive]} onPress={() => setActive(t.key)}>
              <Text style={[s.tabText, on && s.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        <Text style={s.effective}>시행일: {current.effectiveDate}</Text>
        {current.intro ? <Text style={s.intro}>{current.intro}</Text> : null}

        {current.sections.map((section, i) => (
          <View key={i} style={s.section}>
            <Text style={s.heading}>{section.heading}</Text>
            {section.paragraphs.map((p, j) => (
              <Text key={j} style={s.paragraph}>{p}</Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  navbar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  navBtn: { padding: 6, width: 36 },
  navTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: '#0f172a' },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, backgroundColor: '#f1f5f9' },
  tabActive: { backgroundColor: '#3b82f6' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#fff' },
  scroll: { paddingHorizontal: 20, paddingTop: 4 },
  effective: { fontSize: 12, color: '#94a3b8', marginBottom: 12 },
  intro: { fontSize: 13, color: '#475569', lineHeight: 21, marginBottom: 16 },
  section: { marginBottom: 20 },
  heading: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  paragraph: { fontSize: 13, color: '#475569', lineHeight: 21, marginBottom: 8 },
});
