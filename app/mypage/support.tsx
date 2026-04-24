import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const FAQ_LIST = [
  { id: 1, question: '1:1 문의는 어떻게 하나요?', answer: '하단의 문의하기 버튼을 통해 문의를 남겨주시면 영업일 기준 1~2일 내로 답변 드립니다.' },
  { id: 2, question: '회원가입은 어떻게 하나요?', answer: '앱 하단 마이페이지 탭에서 로그인 버튼을 눌러 회원가입을 진행할 수 있습니다.' },
  { id: 3, question: '서비스 이용 방법이 궁금해요.', answer: '서비스 이용 방법은 메인 화면의 도움말 섹션을 참고해 주세요. 추가 문의 사항은 1:1 문의를 이용해 주세요.' },
];

const INQUIRY_LIST = [
  { id: 1, question: '1:1 문의는 어떻게 하나요?', answer: '하단의 문의하기 버튼을 통해 문의를 남겨주시면 영업일 기준 1~2일 내로 답변 드립니다.' },
  { id: 2, question: '문의 답변은 얼마나 걸리나요?', answer: '영업일 기준 1~2일 내로 답변 드리고 있습니다. 빠른 답변을 위해 최선을 다하겠습니다.' },
];

function AccordionItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };

  return (
    <View style={a.card}>
      <TouchableOpacity style={a.header} onPress={toggle} activeOpacity={0.8}>
        <View style={a.questionRow}>
          <Text style={a.qLabel}>Q.</Text>
          <Text style={a.question}>{question}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#9ca3af" />
      </TouchableOpacity>
      {open && (
        <View style={a.answerWrap}>
          <Text style={a.answer}>{answer}</Text>
        </View>
      )}
    </View>
  );
}

export default function SupportPage() {
  const router = useRouter();
  const [active, setActive] = useState<'faq' | 'inquiry'>('faq');
  const list = active === 'faq' ? FAQ_LIST : INQUIRY_LIST;

  return (
    <View style={s.container}>
      {/* 네비 */}
      <View style={s.nav}>
        <TouchableOpacity onPress={() => router.back()} style={s.navBack}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={s.navTitle}>고객센터</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* 헤더 */}
        <View style={s.hero}>
          <Text style={s.heroTitle}>Customer Center</Text>
          <Text style={s.heroSub}>무엇을 도와드릴까요? 신속하게 답변해 드립니다.</Text>
        </View>

        {/* 탭 스위처 */}
        <View style={s.tabSwitch}>
          {([['faq', '자주 묻는 질문'], ['inquiry', '1:1 문의']] as const).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[s.switchItem, active === key && s.switchItemActive]}
              onPress={() => setActive(key)}
              activeOpacity={0.8}
            >
              <Text style={[s.switchLabel, active === key && s.switchLabelActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 아코디언 목록 */}
        <View style={s.list}>
          {list.map((item) => (
            <AccordionItem key={item.id} question={item.question} answer={item.answer} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  nav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingTop: 56, paddingBottom: 12, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  navBack: { width: 40, alignItems: 'flex-start' },
  navTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  scroll: { padding: 16, paddingBottom: 40 },
  hero: { alignItems: 'center', paddingVertical: 24, gap: 6 },
  heroTitle: { fontSize: 22, fontWeight: '900', color: '#111827', letterSpacing: -0.5 },
  heroSub: { fontSize: 13, color: '#9ca3af' },
  tabSwitch: {
    flexDirection: 'row', backgroundColor: '#e5e7eb', borderRadius: 14,
    padding: 4, gap: 4, marginBottom: 16,
  },
  switchItem: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  switchItemActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  switchLabel: { fontSize: 13, fontWeight: '600', color: '#9ca3af' },
  switchLabelActive: { color: '#3b82f6' },
  list: { gap: 10 },
});

const a = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  questionRow: { flexDirection: 'row', gap: 8, flex: 1 },
  qLabel: { fontSize: 14, fontWeight: '800', color: '#60a5fa' },
  question: { fontSize: 14, fontWeight: '600', color: '#1f2937', flex: 1 },
  answerWrap: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#f9fafb' },
  answer: { fontSize: 13, color: '#6b7280', lineHeight: 20, paddingTop: 12 },
});
