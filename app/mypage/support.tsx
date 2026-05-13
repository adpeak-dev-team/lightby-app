import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGetFaqs, useGetMyQnaPosts } from '@/services/qna/queries';

const IMAGE_PREFIX = process.env.EXPO_PUBLIC_IMAGE_PREFIX ?? '';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

function AccordionItem({ question, answer }: { question: string; answer: string | null }) {
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
          <Text style={a.question} numberOfLines={open ? undefined : 2}>{question}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#9ca3af" />
      </TouchableOpacity>
      {open && (
        <View style={a.answerWrap}>
          <Text style={a.answer}>{answer ?? '답변 준비 중입니다.'}</Text>
        </View>
      )}
    </View>
  );
}

function InquiryCard({ content, images, is_answered, created_at, answer }: {
  content: string;
  images: string[];
  is_answered: boolean;
  created_at: string;
  answer: { content: string; created_at: string } | null;
}) {
  const [open, setOpen] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };

  return (
    <View style={c.card}>
      <TouchableOpacity style={c.header} onPress={toggle} activeOpacity={0.8}>
        <View style={{ flex: 1 }}>
          <View style={c.badgeRow}>
            <View style={[c.badge, is_answered ? c.badgeDone : c.badgeWait]}>
              <Text style={[c.badgeText, is_answered ? c.badgeTextDone : c.badgeTextWait]}>
                {is_answered ? '답변 완료' : '답변 대기'}
              </Text>
            </View>
            <Text style={c.date}>{new Date(created_at).toLocaleDateString('ko-KR')}</Text>
          </View>
          <Text style={c.contentPreview} numberOfLines={1}>{content}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#9ca3af" style={{ marginLeft: 8 }} />
      </TouchableOpacity>

      {open && (
        <View style={c.body}>
          <View style={c.section}>
            <Text style={c.sectionLabel}>문의 내용</Text>
            <Text style={c.bodyText}>{content}</Text>
          </View>

          {images.length > 0 && (
            <View style={c.imageGrid}>
              {images.map((img, i) => (
                <Image
                  key={i}
                  source={{ uri: `${IMAGE_PREFIX}${img}` }}
                  style={c.image}
                  resizeMode="cover"
                />
              ))}
            </View>
          )}

          <View style={c.divider} />

          {answer ? (
            <View style={c.answerBox}>
              <Text style={c.answerLabel}>답변 · {new Date(answer.created_at).toLocaleDateString('ko-KR')}</Text>
              <Text style={c.answerText}>{answer.content}</Text>
            </View>
          ) : (
            <Text style={c.pendingText}>영업일 기준 1~2일 내로 답변 드립니다.</Text>
          )}
        </View>
      )}
    </View>
  );
}

export default function SupportPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [active, setActive] = useState<'faq' | 'inquiry'>('faq');

  const { data: faqs = [], isLoading: faqLoading } = useGetFaqs();
  const { data: myQuestions = [], isLoading: inquiryLoading } = useGetMyQnaPosts();

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

        {/* FAQ 탭 */}
        {active === 'faq' && (
          <View style={s.list}>
            {faqLoading ? (
              <Text style={s.empty}>불러오는 중...</Text>
            ) : faqs.length === 0 ? (
              <Text style={s.empty}>등록된 FAQ가 없습니다.</Text>
            ) : (
              faqs.map((item) => (
                <AccordionItem key={item.id} question={item.content} answer={item.answer} />
              ))
            )}
          </View>
        )}

        {/* 1:1 문의 탭 */}
        {active === 'inquiry' && (
          <View style={s.list}>
            {inquiryLoading ? (
              <Text style={s.empty}>불러오는 중...</Text>
            ) : myQuestions.length === 0 ? (
              <Text style={s.empty}>등록된 문의가 없습니다.</Text>
            ) : (
              myQuestions.map((item) => (
                <InquiryCard key={item.id} {...item} />
              ))
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 문의하기 고정 버튼 */}
      <View style={s.fab}>
        <TouchableOpacity
          style={s.fabBtn}
          onPress={() => router.push('/registration/qna')}
          activeOpacity={0.85}
        >
          <Text style={s.fabText}>✏️  문의하기</Text>
        </TouchableOpacity>
        <View style={{ height: insets.bottom, backgroundColor: '#fff' }} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  nav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingTop: 10, paddingBottom: 12, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  navBack: { width: 40, alignItems: 'flex-start' },
  navTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  scroll: { padding: 16 },
  hero: { alignItems: 'center', paddingVertical: 24, gap: 6 },
  heroTitle: { fontSize: 22, fontWeight: '900', color: '#111827', letterSpacing: -0.5 },
  heroSub: { fontSize: 13, color: '#9ca3af' },
  tabSwitch: {
    flexDirection: 'row', backgroundColor: '#e5e7eb', borderRadius: 14,
    padding: 4, gap: 4, marginBottom: 16,
  },
  switchItem: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  switchItemActive: {
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2,
  },
  switchLabel: { fontSize: 13, fontWeight: '600', color: '#9ca3af' },
  switchLabelActive: { color: '#3b82f6' },
  list: { gap: 10 },
  empty: { textAlign: 'center', color: '#9ca3af', fontSize: 14, paddingVertical: 40 },
  fab: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9',
    padding: 16,
  },
  fabBtn: {
    backgroundColor: '#2563eb', borderRadius: 16, paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  fabText: { color: '#fff', fontSize: 15, fontWeight: '800' },
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

const c = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
    overflow: 'hidden',
  },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  badgeDone: { backgroundColor: '#dcfce7' },
  badgeWait: { backgroundColor: '#fef3c7' },
  badgeText: { fontSize: 10, fontWeight: '700' },
  badgeTextDone: { color: '#16a34a' },
  badgeTextWait: { color: '#d97706' },
  date: { fontSize: 11, color: '#9ca3af' },
  contentPreview: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  body: { borderTopWidth: 1, borderTopColor: '#f3f4f6', padding: 16, gap: 12 },
  section: { gap: 4 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#9ca3af' },
  bodyText: { fontSize: 14, color: '#374151', lineHeight: 22 },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  image: { width: '31%', aspectRatio: 1, borderRadius: 10 },
  divider: { height: 1, backgroundColor: '#e5e7eb' },
  answerBox: { backgroundColor: '#eff6ff', borderRadius: 12, padding: 12, gap: 4 },
  answerLabel: { fontSize: 11, fontWeight: '700', color: '#60a5fa' },
  answerText: { fontSize: 14, color: '#1d4ed8', lineHeight: 22 },
  pendingText: { fontSize: 12, color: '#9ca3af', textAlign: 'center', paddingVertical: 4 },
});
