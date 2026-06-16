import { useState } from 'react';
import { View, Modal, Pressable, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useReportContent, useBlockUser } from '@/services/community/mutations';
import { REPORT_REASONS } from '@/lib/constants';
import { toast } from '@/hooks/use-toast';

type Props = {
  visible: boolean;
  onClose: () => void;
  reporterId?: number;          // 신고/차단을 수행하는 로그인 사용자
  targetUserId?: number;        // 신고/차단 대상 작성자
  targetType: 'board' | 'reply';
  targetId: number;
  targetLabel?: string;         // 표시용 (예: '이 게시글', '이 댓글')
  targetWithdrawn?: boolean;    // 대상 작성자가 탈퇴한 회원인지
  onBlocked?: () => void;       // 차단 완료 후 콜백 (상세 화면이면 뒤로가기 등)
};

// 커뮤니티 콘텐츠(게시글/댓글) 신고·차단 액션 시트 — App Store 가이드라인 1.2
export default function ContentActionSheet({
  visible, onClose, reporterId, targetUserId, targetType, targetId, targetLabel = '이 콘텐츠', targetWithdrawn, onBlocked,
}: Props) {
  const [mode, setMode] = useState<'menu' | 'report' | 'block'>('menu');
  const reportMutation = useReportContent();
  const blockMutation = useBlockUser();

  const close = () => {
    setMode('menu');
    onClose();
  };

  const requireLogin = (): boolean => {
    if (!reporterId) {
      toast.info('로그인이 필요한 서비스입니다.');
      close();
      return false;
    }
    return true;
  };

  const handleReport = (reason: string) => {
    if (!reporterId) return;
    reportMutation.mutate(
      { reporterId, targetType, targetId, reason },
      {
        onSuccess: () => { toast.success('신고가 접수되었습니다. 24시간 이내에 검토 후 조치됩니다.'); close(); },
        onError: () => toast.error('신고 처리 중 오류가 발생했습니다.'),
      },
    );
  };

  const handleBlock = () => {
    if (!reporterId || !targetUserId) { toast.error('차단할 수 없는 대상입니다.'); close(); return; }
    blockMutation.mutate(
      { blockerId: reporterId, blockedId: targetUserId },
      {
        onSuccess: () => {
          toast.success('해당 사용자를 차단했습니다.');
          close();
          onBlocked?.();
        },
        onError: () => toast.error('차단 처리 중 오류가 발생했습니다.'),
      },
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={s.overlay} onPress={close} />
      <View style={s.sheet}>
        {/* 탈퇴한 회원: 신고/차단 불가 안내 */}
        {targetWithdrawn ? (
          <>
            <View style={s.handle} />
            <Text style={s.withdrawnText}>탈퇴된 회원입니다.</Text>
            <TouchableOpacity style={[s.row, s.cancelRow]} onPress={close}>
              <Text style={s.cancelText}>확인</Text>
            </TouchableOpacity>
          </>
        ) : (
        <>
        {mode === 'menu' && (
          <>
            <View style={s.handle} />
            <TouchableOpacity
              style={s.row}
              onPress={() => { if (requireLogin()) setMode('report'); }}
            >
              <Ionicons name="flag-outline" size={20} color="#ef4444" />
              <Text style={s.rowTextDanger}>신고하기</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.row}
              onPress={() => { if (requireLogin()) setMode('block'); }}
            >
              <Ionicons name="ban-outline" size={20} color="#ef4444" />
              <Text style={s.rowTextDanger}>이 사용자 차단하기</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.row, s.cancelRow]} onPress={close}>
              <Text style={s.cancelText}>취소</Text>
            </TouchableOpacity>
          </>
        )}

        {mode === 'report' && (
          <>
            <Text style={s.title}>신고 사유 선택</Text>
            <Text style={s.sub}>{targetLabel}을(를) 신고합니다.</Text>
            {REPORT_REASONS.map((reason) => (
              <TouchableOpacity
                key={reason}
                style={s.reasonRow}
                onPress={() => handleReport(reason)}
                disabled={reportMutation.isPending}
              >
                <Text style={s.reasonText}>{reason}</Text>
                <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[s.row, s.cancelRow]} onPress={() => setMode('menu')}>
              <Text style={s.cancelText}>뒤로</Text>
            </TouchableOpacity>
          </>
        )}

        {mode === 'block' && (
          <>
            <Text style={s.title}>사용자 차단</Text>
            <Text style={s.sub}>
              차단하면 이 사용자의 게시글과 댓글이 더 이상 표시되지 않으며, 운영자에게 통보됩니다.
            </Text>
            <View style={s.btnRow}>
              <TouchableOpacity style={s.btnSecondary} onPress={() => setMode('menu')}>
                <Text style={s.btnSecondaryText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnDanger} onPress={handleBlock} disabled={blockMutation.isPending}>
                <Text style={s.btnDangerText}>{blockMutation.isPending ? '처리 중...' : '차단하기'}</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
        </>
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff',
    borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, paddingHorizontal: 4 },
  rowTextDanger: { fontSize: 16, fontWeight: '600', color: '#ef4444' },
  cancelRow: { justifyContent: 'center', marginTop: 4, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#64748b' },
  withdrawnText: { fontSize: 15, fontWeight: '600', color: '#64748b', textAlign: 'center', paddingVertical: 20 },
  title: { fontSize: 17, fontWeight: '700', color: '#0f172a', textAlign: 'center', marginBottom: 6 },
  sub: { fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 16, lineHeight: 19 },
  reasonRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 15, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#f8fafc',
  },
  reasonText: { fontSize: 15, color: '#334155' },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btnSecondary: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center' },
  btnSecondaryText: { fontSize: 14, fontWeight: '600', color: '#334155' },
  btnDanger: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#ef4444', alignItems: 'center' },
  btnDangerText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
