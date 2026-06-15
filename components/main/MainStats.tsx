import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useGetMainStats } from '@/services/site/queries';

/**
 * 홈 상단 통계 바 — lightby-front(웹) MainStats와 동일.
 * 신규 현장 수 / 실시간 방문자(라이브) 2개 카드.
 */
function StatCard({
  icon, label, value, suffix, live,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  suffix: string;
  live?: boolean;
}) {
  return (
    <View style={s.card}>
      <View style={s.top}>
        <Ionicons name={icon} size={16} color="#94a3b8" />
        <View style={s.labelRow}>
          {live && <View style={s.liveDot} />}
          <Text style={s.label}>{label}</Text>
        </View>
      </View>
      <Text style={s.value}>
        {value.toLocaleString()}
        <Text style={s.suffix}> {suffix}</Text>
      </Text>
    </View>
  );
}

export default function MainStats() {
  const { data } = useGetMainStats();
  return (
    <View style={s.wrap}>
      <StatCard icon="business-outline" label="신규 현장" value={data?.newSiteCount ?? 0} suffix="곳" />
      <StatCard icon="eye-outline" label="실시간 방문자" value={data?.todayVisitors ?? 0} suffix="명" live />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: 8, // gap-2
    paddingHorizontal: 16, // px-4
    marginBottom: 16, // mb-4
  },
  card: {
    flex: 1,
    borderRadius: 12, // rounded-xl
    backgroundColor: '#f8fafc', // bg-slate-50
    paddingHorizontal: 16, // px-4
    paddingVertical: 14, // py-3.5
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e', // green-500
  },
  label: {
    fontSize: 12, // text-xs
    fontWeight: '500', // font-medium
    color: '#64748b', // slate-500
  },
  value: {
    marginTop: 6, // mt-1.5
    fontSize: 24, // text-2xl
    fontWeight: '700', // font-bold
    color: '#0f172a', // slate-900
    textAlign: 'right',
  },
  suffix: {
    fontSize: 14, // text-sm
    fontWeight: '600', // font-semibold
    color: '#64748b', // slate-500
  },
});
