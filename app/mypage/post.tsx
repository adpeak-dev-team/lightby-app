import { useState, useCallback } from 'react';
import {
  View, FlatList, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Modal, Alert,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGetUserJobPostList, useGetUserBoardPostList, USER_POST_KEYS } from '@/services/user/queries';
import { useGetMe } from '@/services/auth/queries';
import { deleteJobPost } from '@/services/site/api';
import { deleteBoardPost } from '@/services/community/api';
import { JobCard, JobItem } from '@/components/common/JobCard';
import { CommunityCard } from '@/components/common/CommunityCard';
import { UserJobPostItem, UserBoardPostItem } from '@/services/user/types';

const IMAGE_PREFIX = process.env.EXPO_PUBLIC_IMAGE_PREFIX ?? '';


type Tab = 'jobs' | 'boards';

function DeleteModal({ visible, onConfirm, onCancel, isPending }: {
  visible: boolean; onConfirm: () => void; onCancel: () => void; isPending: boolean;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={m.overlay}>
        <View style={m.box}>
          <View style={m.iconWrap}><Ionicons name="trash" size={28} color="#f87171" /></View>
          <Text style={m.title}>정말 삭제하시겠어요?</Text>
          <Text style={m.desc}>삭제 후에는 복구가 불가능합니다.</Text>
          <View style={m.btnRow}>
            <TouchableOpacity style={m.cancelBtn} onPress={onCancel}><Text style={m.cancelText}>취소</Text></TouchableOpacity>
            <TouchableOpacity style={[m.deleteBtn, isPending && m.btnDisabled]} onPress={onConfirm} disabled={isPending}>
              <Text style={m.deleteText}>{isPending ? '삭제 중...' : '삭제'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function JobPostList() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useGetUserJobPostList();
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const posts = data?.pages.flatMap((p) => p) ?? [];

  const handleDelete = async () => {
    if (deleteTargetId === null) return;
    setIsDeleting(true);
    try {
      await deleteJobPost(deleteTargetId);
      qc.invalidateQueries({ queryKey: USER_POST_KEYS.jobs });
      qc.invalidateQueries({ queryKey: USER_POST_KEYS.count });
      // 삭제된 공고가 다른 목록에서도 즉시 사라지도록 무효화
      qc.invalidateQueries({ queryKey: ['my-job-postings'] }); // 지원자 관리
      qc.invalidateQueries({ queryKey: ['jobs'] });
      qc.invalidateQueries({ queryKey: ['jobs-free'] });
      qc.invalidateQueries({ queryKey: ['favorite-sites'] });
      qc.invalidateQueries({ queryKey: ['my-recent-posts'] });
    } finally {
      setIsDeleting(false);
      setDeleteTargetId(null);
    }
  };

  if (isLoading) return <ActivityIndicator size="large" color="#60a5fa" style={{ marginTop: 40 }} />;
  if (error) return <Text style={e.errorText}>데이터를 불러오지 못했습니다.</Text>;
  if (posts.length === 0) return <Text style={e.emptyText}>등록한 구인공고가 없습니다.</Text>;

  return (
    <>
      <FlatList
        data={posts}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={e.itemWrap}>
            <JobCard job={item as JobItem} onPress={() => router.push({ pathname: '/posts/site/[id]', params: { id: item.id } })} />
            <TouchableOpacity style={e.deleteBtn} onPress={() => setDeleteTargetId(item.id)}>
              <Ionicons name="trash-outline" size={16} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={e.list}
        showsVerticalScrollIndicator={false}
        onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator size="small" color="#60a5fa" style={{ paddingVertical: 16 }} /> : null}
      />
      <DeleteModal
        visible={deleteTargetId !== null}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTargetId(null)}
        isPending={isDeleting}
      />
    </>
  );
}

function BoardPostList() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: me } = useGetMe();
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useGetUserBoardPostList();
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const posts = data?.pages.flatMap((p) => p) ?? [];

  const handleDelete = async () => {
    if (deleteTargetId === null || !me?.id) return;
    setIsDeleting(true);
    try {
      await deleteBoardPost(deleteTargetId, me.id);
      qc.invalidateQueries({ queryKey: USER_POST_KEYS.boards });
      qc.invalidateQueries({ queryKey: USER_POST_KEYS.count });
    } finally {
      setIsDeleting(false);
      setDeleteTargetId(null);
    }
  };

  if (isLoading) return <ActivityIndicator size="large" color="#60a5fa" style={{ marginTop: 40 }} />;
  if (error) return <Text style={e.errorText}>데이터를 불러오지 못했습니다.</Text>;
  if (posts.length === 0) return <Text style={e.emptyText}>등록한 게시글이 없습니다.</Text>;

  return (
    <>
      <FlatList
        data={posts}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={e.itemWrap}>
            <CommunityCard item={item as any} onPress={() => router.push({ pathname: '/posts/board/[id]', params: { id: item.id } })} />
            <TouchableOpacity style={e.deleteBtn} onPress={() => setDeleteTargetId(item.id)}>
              <Ionicons name="trash-outline" size={16} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={e.list}
        showsVerticalScrollIndicator={false}
        onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator size="small" color="#60a5fa" style={{ paddingVertical: 16 }} /> : null}
      />
      <DeleteModal
        visible={deleteTargetId !== null}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTargetId(null)}
        isPending={isDeleting}
      />
    </>
  );
}

export default function PostPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('jobs');

  return (
    <View style={s.container}>
      <View style={s.nav}>
        <TouchableOpacity onPress={() => router.back()} style={s.navBack}>
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={s.navTitle}>내 글 관리</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.tabBar}>
        {([['jobs', '구인 공고 관리'], ['boards', '게시판 관리']] as const).map(([key, label]) => (
          <TouchableOpacity key={key} style={s.tabItem} onPress={() => setActiveTab(key)} activeOpacity={0.8}>
            <Text style={[s.tabLabel, activeTab === key && s.tabLabelActive]}>{label}</Text>
            <View style={[s.tabUnderline, activeTab === key && s.tabUnderlineActive]} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flex: 1 }}>
        {activeTab === 'jobs' ? <JobPostList /> : <BoardPostList />}
      </View>

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
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tabItem: { flex: 1, alignItems: 'center', paddingTop: 12, paddingBottom: 0 },
  tabLabel: { fontSize: 14, fontWeight: '600', color: '#94a3b8', paddingBottom: 10 },
  tabLabelActive: { color: '#0f172a' },
  tabUnderline: { height: 2, width: '100%', backgroundColor: 'transparent' },
  tabUnderlineActive: { backgroundColor: '#0f172a' },
});

const e = StyleSheet.create({
  list: { padding: 12, paddingBottom: 32 },
  itemWrap: { position: 'relative', marginBottom: 10 },
  deleteBtn: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 8, width: 30, height: 30, alignItems: 'center', justifyContent: 'center',
  },
  emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 60, fontSize: 14 },
  errorText: { textAlign: 'center', color: '#f87171', marginTop: 60, fontSize: 14 },
});

const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  box: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 320, alignItems: 'center' },
  iconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  desc: { fontSize: 14, color: '#94a3b8', marginBottom: 20 },
  btnRow: { flexDirection: 'row', gap: 10, width: '100%' },
  cancelBtn: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  deleteBtn: { flex: 1, backgroundColor: '#f87171', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  deleteText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  btnDisabled: { opacity: 0.6 },
});
