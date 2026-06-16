import { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, Pressable } from 'react-native';
import { Text } from '@/components/common/AppText';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useGetMe } from '@/services/auth/queries';
import { useGetBlockedUsers } from '@/services/community/queries';
import { useUnblockUser } from '@/services/community/mutations';
import { toast } from '@/hooks/use-toast';

// 내가 차단한 사용자 목록 + 차단 해제 (App Store 가이드라인 1.2)
export default function BlockedUsersPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: me } = useGetMe();
  const { data: blocked = [], isLoading } = useGetBlockedUsers(me?.id);
  const unblockMutation = useUnblockUser();

  // 차단 해제 즉시 목록에서 제거하기 위한 낙관적 처리
  const [removedIds, setRemovedIds] = useState<number[]>([]);
  const visible = blocked.filter((u) => !removedIds.includes(u.user_id));

  // 확인 대상 (Alert는 웹에서 버튼 콜백이 동작하지 않아 커스텀 모달 사용)
  const [confirmTarget, setConfirmTarget] = useState<{ id: number; nickname: string | null } | null>(null);

  const confirmUnblock = () => {
    if (!me?.id || !confirmTarget) return;
    const blockedId = confirmTarget.id;
    setConfirmTarget(null);
    setRemovedIds((prev) => [...prev, blockedId]); // 즉시 목록에서 제거
    unblockMutation.mutate(
      { blockerId: me.id, blockedId },
      {
        onSuccess: () => toast.success('차단을 해제했습니다.'),
        onError: () => {
          setRemovedIds((prev) => prev.filter((id) => id !== blockedId)); // 실패 시 복원
          toast.error('잠시 후 다시 시도해 주세요.');
        },
      },
    );
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={s.navbar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={s.navBtn}>
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={s.navTitle}>차단 관리</Text>
        <View style={s.navBtn} />
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#60a5fa" style={{ marginTop: 60 }} />
      ) : visible.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="ban-outline" size={40} color="#cbd5e1" />
          <Text style={s.emptyText}>차단한 사용자가 없습니다.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
          <Text style={s.desc}>차단한 사용자의 게시글과 댓글은 표시되지 않습니다.</Text>
          {visible.map((u) => (
            <View key={u.user_id} style={s.row}>
              <View style={s.avatar}>
                <Ionicons name="person-outline" size={18} color="#94a3b8" />
              </View>
              <Text style={s.nickname}>{u.nickname ?? '탈퇴한 회원'}</Text>
              <TouchableOpacity
                style={s.unblockBtn}
                onPress={() => setConfirmTarget({ id: u.user_id, nickname: u.nickname })}
                disabled={unblockMutation.isPending}
              >
                <Text style={s.unblockText}>차단 해제</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* 차단 해제 확인 모달 */}
      <Modal visible={!!confirmTarget} transparent animationType="fade" onRequestClose={() => setConfirmTarget(null)}>
        <Pressable style={s.overlay} onPress={() => setConfirmTarget(null)} />
        <View style={s.modal}>
          <Text style={s.modalTitle}>차단 해제</Text>
          <Text style={s.modalSub}>
            {confirmTarget?.nickname ?? '이 사용자'}님을 차단 해제하시겠습니까?{'\n'}이 사용자의 게시글과 댓글이 다시 표시됩니다.
          </Text>
          <View style={s.modalBtns}>
            <TouchableOpacity style={s.modalBtnSecondary} onPress={() => setConfirmTarget(null)}>
              <Text style={s.modalBtnSecondaryText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.modalBtnPrimary} onPress={confirmUnblock}>
              <Text style={s.modalBtnPrimaryText}>차단 해제</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  desc: { fontSize: 13, color: '#94a3b8', paddingHorizontal: 16, paddingVertical: 10 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 15, color: '#94a3b8' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f8fafc',
  },
  avatar: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center',
  },
  nickname: { flex: 1, fontSize: 15, fontWeight: '500', color: '#0f172a' },
  unblockBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  unblockText: { fontSize: 13, fontWeight: '600', color: '#64748b' },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  modal: {
    position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff',
    borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', textAlign: 'center', marginBottom: 6 },
  modalSub: { fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 22, lineHeight: 19 },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalBtnSecondary: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center' },
  modalBtnSecondaryText: { fontSize: 14, fontWeight: '600', color: '#334155' },
  modalBtnPrimary: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#3b82f6', alignItems: 'center' },
  modalBtnPrimaryText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

