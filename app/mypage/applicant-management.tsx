import {
  View, FlatList, TouchableOpacity, StyleSheet, Image,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGetMyJobPostings } from '@/services/site/queries';
import { ApplicantItem } from '@/services/site/types';
import { getImageUrl } from '@/lib/lib';

const IMAGE_PREFIX = process.env.EXPO_PUBLIC_IMAGE_PREFIX ?? '';

function SkeletonCard() {
  return (
    <View style={sk.card}>
      <View style={sk.thumb} />
      <View style={sk.content}>
        <View style={sk.line1} />
        <View style={sk.line2} />
        <View style={sk.line3} />
      </View>
    </View>
  );
}

function ApplicantCard({ item }: { item: ApplicantItem }) {
  const router = useRouter();
  const imageUri = item.thumbnail ? getImageUrl(item.thumbnail) : null;
  const d = new Date(item.created_at);
  const dateStr = `${String(d.getFullYear()).slice(2)}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  const endDate = new Date(d);
  endDate.setDate(endDate.getDate() + 10);
  const endStr = `${String(endDate.getFullYear()).slice(2)}.${String(endDate.getMonth() + 1).padStart(2, '0')}.${String(endDate.getDate()).padStart(2, '0')}`;

  return (
    <View style={c.card}>
      <TouchableOpacity
        style={c.row}
        onPress={() => router.push({ pathname: '/posts/site/[id]', params: { id: item.idx } })}
        activeOpacity={0.8}
      >
        <View style={c.thumbWrap}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={c.thumb} />
          ) : (
            <View style={[c.thumb, c.thumbPlaceholder]}>
              <Ionicons name="image-outline" size={24} color="#cbd5e1" />
            </View>
          )}
        </View>
        <View style={c.content}>
          <View style={c.statusRow}>
            <View style={[c.statusBadge, item.is_display ? c.badgeActive : c.badgeEnded]}>
              <Text style={[c.statusText, item.is_display ? c.statusTextActive : c.statusTextEnded]}>
                {item.is_display ? '진행중' : '마감'}
              </Text>
            </View>
            <Text style={c.dateRange}>{dateStr} — {endStr}</Text>
          </View>
          <Text style={c.title} numberOfLines={2}>{item.post}</Text>
        </View>
      </TouchableOpacity>

      <View style={c.footer}>
        <View style={c.stats}>
          <View style={c.stat}>
            <Text style={c.statLabel}>전체 지원자</Text>
            <Text style={c.statVal}>{item.allcount}<Text style={c.statUnit}> 명</Text></Text>
          </View>
          <View style={c.stat}>
            <Text style={[c.statLabel, c.unreadLabel]}>미열람</Text>
            <Text style={[c.statVal, c.unreadVal]}>{item.unreads_num}<Text style={c.statUnit}> 명</Text></Text>
          </View>
        </View>
        <TouchableOpacity
          style={c.viewBtn}
          onPress={() => router.push(`/posts/applicants/${item.idx}` as never)}
          activeOpacity={0.85}
        >
          <Text style={c.viewBtnText}>지원자 보기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ApplicantManagementPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isLoading } = useGetMyJobPostings();
  const list = data?.items ?? [];
  const allCount = list.length;
  const goingCount = list.filter((i) => i.is_display).length;
  const endCount = list.filter((i) => !i.is_display).length;

  return (
    <View style={s.container}>
      <View style={s.nav}>
        <TouchableOpacity onPress={() => router.back()} style={s.navBack}>
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={s.navTitle}>지원자 관리</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={isLoading ? [] : list}
        keyExtractor={(item) => String(item.idx)}
        renderItem={({ item }) => <ApplicantCard item={item} />}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={s.statsGrid}>
            {[
              { label: '전체 공고', value: allCount, labelColor: '#64748b', valColor: '#1e293b' },
              { label: '진행중', value: goingCount, labelColor: '#60a5fa', valColor: '#2563eb' },
              { label: '마감', value: endCount, labelColor: '#fb7185', valColor: '#e11d48' },
            ].map(({ label, value, labelColor, valColor }) => (
              <View key={label} style={s.statCard}>
                <Text style={[s.statLabel, { color: labelColor }]}>{label}</Text>
                <Text style={[s.statVal, { color: valColor }]}>{value}</Text>
              </View>
            ))}
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={s.skeletons}>
              {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
            </View>
          ) : (
            <Text style={s.empty}>등록된 공고가 없습니다.</Text>
          )
        }
      />

      <View style={{ height: insets.bottom, backgroundColor: '#fff' }} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  nav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingTop: 10, paddingBottom: 12, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  navBack: { width: 40, alignItems: 'flex-start' },
  navTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  list: { padding: 12, paddingBottom: 32, gap: 10 },
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  statLabel: { fontSize: 12, fontWeight: '500', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  statVal: { fontSize: 24, fontWeight: '700' },
  skeletons: { gap: 10 },
  empty: { textAlign: 'center', color: '#94a3b8', marginTop: 60, fontSize: 14 },
});

const sk = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 12, flexDirection: 'row', gap: 12 },
  thumb: { width: 80, height: 80, borderRadius: 10, backgroundColor: '#e2e8f0', flexShrink: 0 },
  content: { flex: 1, gap: 8, justifyContent: 'center' },
  line1: { height: 10, backgroundColor: '#e2e8f0', borderRadius: 5, width: '30%' },
  line2: { height: 14, backgroundColor: '#e2e8f0', borderRadius: 5, width: '80%' },
  line3: { height: 10, backgroundColor: '#e2e8f0', borderRadius: 5, width: '40%' },
});

const c = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  row: { flexDirection: 'row', gap: 12 },
  thumbWrap: { width: 80, height: 80, borderRadius: 10, overflow: 'hidden', flexShrink: 0, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9' },
  thumb: { width: '100%', height: '100%' },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, gap: 6 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  badgeActive: { backgroundColor: '#dbeafe', borderWidth: 1, borderColor: '#bfdbfe' },
  badgeEnded: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  statusText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  statusTextActive: { color: '#2563eb' },
  statusTextEnded: { color: '#94a3b8' },
  dateRange: { fontSize: 10, color: '#94a3b8', fontWeight: '500' },
  title: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f1f5f9', marginTop: 10, paddingTop: 10 },
  stats: { flexDirection: 'row', gap: 20 },
  stat: { gap: 2 },
  statLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '500' },
  statVal: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
  statUnit: { fontSize: 10, fontWeight: '500' },
  unreadLabel: { color: '#fb7185' },
  unreadVal: { color: '#e11d48', fontWeight: '700' },
  viewBtn: { backgroundColor: '#1e293b', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  viewBtnText: { fontSize: 11, fontWeight: '700', color: '#fff' },
});
