import { useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Share, useWindowDimensions,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGetZodiacs, useGetTodayFortune } from '@/services/fortune/queries';
import type { TodayFortune } from '@/services/fortune/types';

function FortuneRow({ label, emoji, text }: { label: string; emoji: string; text: string }) {
  return (
    <View style={s.row}>
      <View style={s.rowHead}>
        <Text style={s.rowEmoji}>{emoji}</Text>
        <Text style={s.rowLabel}>{label}</Text>
      </View>
      <Text style={s.rowText}>{text}</Text>
    </View>
  );
}

export default function FortunePage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [selected, setSelected] = useState<string | null>(null);

  const { data: zodiacs, isLoading: zodiacsLoading } = useGetZodiacs();
  const { data: fortune, isLoading: fortuneLoading } = useGetTodayFortune(selected);

  // 3열 그리드 아이템 폭 (좌우 패딩 16*2, 간격 12*2)
  const itemW = (width - 32 - 24) / 3;

  const handleShare = async () => {
    if (!fortune) return;
    const text = [
      `${fortune.zodiac}띠 오늘의 운세 (${fortune.date})`,
      `오늘의 점수 ${fortune.score}점`,
      ``,
      `🌈 총운: ${fortune.total}`,
      `💰 금전운: ${fortune.money}`,
      `💕 애정운: ${fortune.love}`,
      fortune.advice ? `\n💡 ${fortune.advice}` : ``,
    ].filter(Boolean).join('\n');
    try {
      await Share.share({ title: '오늘의 운세', message: text });
    } catch {
      // 공유 취소 등은 무시
    }
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => (selected ? setSelected(null) : router.back())}
          style={s.backBtn}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color="#475569" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>오늘의 운세</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* 1단계: 띠 선택 */}
        {!selected && (
          <>
            <Text style={s.guide}>띠를 선택하면 오늘의 운세를 알려드려요.</Text>
            {zodiacsLoading ? (
              <ActivityIndicator color="#60a5fa" style={{ marginTop: 40 }} />
            ) : (
              <View style={s.grid}>
                {zodiacs?.map((z) => (
                  <TouchableOpacity
                    key={z.name}
                    style={[s.zodiac, { width: itemW }]}
                    onPress={() => setSelected(z.name)}
                    activeOpacity={0.8}
                  >
                    <Text style={s.zodiacEmoji}>{z.emoji}</Text>
                    <Text style={s.zodiacName}>{z.name}띠</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}

        {/* 2단계: 운세 결과 */}
        {selected && (
          fortuneLoading || !fortune ? (
            <View style={s.loadingBox}>
              <Text style={s.loadingText}>운세를 보는 중...</Text>
            </View>
          ) : (
            <FortuneResult fortune={fortune} onShare={handleShare} />
          )
        )}
      </ScrollView>
    </View>
  );
}

function FortuneResult({ fortune, onShare }: { fortune: TodayFortune; onShare: () => void }) {
  const pct = Math.max(0, Math.min(100, fortune.score));
  return (
    <View style={{ gap: 16 }}>
      {/* 요약 카드 */}
      <LinearGradient colors={['#fdf2f8', '#fefce8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.summary}>
        <Text style={s.summaryEmoji}>{fortune.emoji}</Text>
        <Text style={s.summaryZodiac}>{fortune.zodiac}띠</Text>
        <Text style={s.summaryDate}>{fortune.date}</Text>
        <Text style={s.summaryScore}>오늘의 점수 {fortune.score}점</Text>
        <View style={s.barTrack}>
          <LinearGradient
            colors={['#f472b6', '#fbbf24']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[s.barFill, { width: `${pct}%` }]}
          />
        </View>
      </LinearGradient>

      {/* 행운의 색 / 숫자 */}
      {(fortune.luckyColor || fortune.luckyNumber != null) && (
        <View style={s.luckyRow}>
          <View style={s.luckyBox}>
            <Text style={s.luckyLabel}>행운의 색</Text>
            <Text style={s.luckyValue}>{fortune.luckyColor ?? '-'}</Text>
          </View>
          <View style={s.luckyBox}>
            <Text style={s.luckyLabel}>행운의 숫자</Text>
            <Text style={s.luckyValue}>{fortune.luckyNumber ?? '-'}</Text>
          </View>
        </View>
      )}

      <FortuneRow label="총운" emoji="🌈" text={fortune.total} />
      <FortuneRow label="금전운" emoji="💰" text={fortune.money} />
      <FortuneRow label="애정운" emoji="💕" text={fortune.love} />

      {!!fortune.advice && (
        <View style={s.advice}>
          <Text style={s.adviceText}>{fortune.advice}</Text>
        </View>
      )}

      <TouchableOpacity onPress={onShare} activeOpacity={0.85}>
        <LinearGradient colors={['#a78bfa', '#e879f9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.shareBtn}>
          <Text style={s.shareText}>공유하기</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
  guide: { fontSize: 14, color: '#94a3b8', marginBottom: 16 },
  // 띠 그리드
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  zodiac: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
  },
  zodiacEmoji: { fontSize: 30 },
  zodiacName: { fontSize: 14, fontWeight: '600', color: '#334155' },
  loadingBox: { paddingVertical: 48, alignItems: 'center' },
  loadingText: { fontSize: 14, color: '#94a3b8' },
  // 요약 카드
  summary: { borderRadius: 16, paddingHorizontal: 20, paddingVertical: 24, alignItems: 'center' },
  summaryEmoji: { fontSize: 48, marginBottom: 8 },
  summaryZodiac: { fontSize: 18, fontWeight: '700', color: '#334155' },
  summaryDate: { fontSize: 12, color: '#64748b', marginBottom: 12 },
  summaryScore: { fontSize: 14, fontWeight: '600', color: '#475569' },
  barTrack: { marginTop: 8, height: 8, width: '100%', borderRadius: 999, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.7)' },
  barFill: { height: 8, borderRadius: 999 },
  // 행운 박스
  luckyRow: { flexDirection: 'row', gap: 12 },
  luckyBox: { flex: 1, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center' },
  luckyLabel: { fontSize: 12, color: '#94a3b8', marginBottom: 4 },
  luckyValue: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  // 운세 행
  row: { borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', paddingHorizontal: 16, paddingVertical: 12 },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  rowEmoji: { fontSize: 16 },
  rowLabel: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  rowText: { fontSize: 14, color: '#475569', lineHeight: 22 },
  // 조언
  advice: { borderRadius: 16, backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fef3c7', paddingHorizontal: 16, paddingVertical: 12 },
  adviceText: { fontSize: 14, color: '#92400e', lineHeight: 22 },
  // 공유 버튼
  shareBtn: { paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  shareText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
