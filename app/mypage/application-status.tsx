import { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, Image, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useGetMyApplications } from '@/services/site/queries';
import { useCancelApplication } from '@/services/site/mutations';
import { ApplicationItem } from '@/services/site/types';

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

function ApplicationCard({
  item, onCancel, isCancelling,
}: { item: ApplicationItem; onCancel: (id: number) => void; isCancelling: boolean }) {
  const router = useRouter();
  const imageUri = item.thumbnail ? `${IMAGE_PREFIX}${item.thumbnail}` : null;
  const isRead = item.status === 'read';
  const date = new Date(item.created_at);
  const dateStr = `${String(date.getFullYear()).slice(2)}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;

  return (
    <View style={c.card}>
      <View style={c.row}>
        <View style={c.thumbWrap}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={c.thumb} />
          ) : (
            <View style={[c.thumb, c.thumbPlaceholder]}>
              <Ionicons name="image-outline" size={24} color="#d1d5db" />
            </View>
          )}
          {!isRead && <View style={c.newBadge}><Text style={c.newBadgeText}>NEW</Text></View>}
        </View>

        <View style={c.content}>
          <Text style={c.title} numberOfLines={2}>{item.subject}</Text>
          <View style={c.metaRow}><Text style={c.metaLabel}>지원일</Text><Text style={c.metaVal}>{dateStr}</Text></View>
          <View style={c.metaRow}><Text style={c.metaLabel}>열람</Text><Text style={[c.metaVal, isRead ? c.read : c.unread]}>{isRead ? '확인완료' : '미열람'}</Text></View>
          <View style={c.metaRow}><Text style={c.metaLabel}>상태</Text><Text style={[c.metaVal, c.applying]}>지원중</Text></View>
        </View>
      </View>

      <View style={c.footer}>
        <TouchableOpacity
          style={[c.cancelBtn, isCancelling && c.btnDisabled]}
          onPress={() => onCancel(item.apply_id)}
          disabled={isCancelling}
        >
          <Text style={c.cancelBtnText}>{isCancelling ? '취소 중...' : '지원취소'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={c.viewBtn}
          onPress={() => router.push({ pathname: '/posts/site/[id]', params: { id: item.site_idx } })}
        >
          <Text style={c.viewBtnText}>공고보기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function ApplicationStatusPage() {
  const router = useRouter();
  const { data, isLoading } = useGetMyApplications();
  const { mutate: cancel, isPending: isCancelling, variables: cancellingId } = useCancelApplication();
  const list = data?.items ?? [];

  return (
    <View style={s.container}>
      <View style={s.nav}>
        <TouchableOpacity onPress={() => router.back()} style={s.navBack}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={s.navTitle}>내 지원 현황</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={s.skeletons}>
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => String(item.apply_id)}
          renderItem={({ item }) => (
            <ApplicationCard
              item={item}
              onCancel={cancel}
              isCancelling={isCancelling && cancellingId === item.apply_id}
            />
          )}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={s.empty}>지원한 내역이 없습니다.</Text>}
        />
      )}
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
  skeletons: { padding: 12, gap: 10 },
  list: { padding: 12, paddingBottom: 32, gap: 10 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 80, fontSize: 14 },
});

const sk = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 12, flexDirection: 'row', gap: 12, marginBottom: 10 },
  thumb: { width: 84, height: 84, borderRadius: 10, backgroundColor: '#e5e7eb', flexShrink: 0 },
  content: { flex: 1, gap: 8, justifyContent: 'center' },
  line1: { height: 14, backgroundColor: '#e5e7eb', borderRadius: 5, width: '80%' },
  line2: { height: 10, backgroundColor: '#e5e7eb', borderRadius: 5, width: '50%' },
  line3: { height: 10, backgroundColor: '#e5e7eb', borderRadius: 5, width: '60%' },
});

const c = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  row: { flexDirection: 'row', gap: 12 },
  thumbWrap: { width: 84, height: 84, borderRadius: 10, overflow: 'hidden', flexShrink: 0, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#f3f4f6' },
  thumb: { width: '100%', height: '100%' },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  newBadge: { position: 'absolute', top: 4, left: 4, backgroundColor: '#ef4444', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2 },
  newBadgeText: { color: '#fff', fontSize: 8, fontWeight: '900' },
  content: { flex: 1, gap: 4 },
  title: { fontSize: 14, fontWeight: '700', color: '#111827' },
  metaRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  metaLabel: { fontSize: 11, color: '#9ca3af', width: 32 },
  metaVal: { fontSize: 11, fontWeight: '600', color: '#374151' },
  read: { color: '#0284c7' },
  unread: { color: '#9ca3af' },
  applying: { color: '#059669' },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6', marginTop: 10, paddingTop: 10 },
  cancelBtn: { backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  cancelBtnText: { fontSize: 11, fontWeight: '700', color: '#6b7280' },
  btnDisabled: { opacity: 0.5 },
  viewBtn: { backgroundColor: '#1f2937', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  viewBtnText: { fontSize: 11, fontWeight: '700', color: '#fff' },
});
