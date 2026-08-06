import {
  View, TouchableOpacity, StyleSheet,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { Ionicons } from '@expo/vector-icons';
import { formatDate } from '@/lib/lib';

type Reply = {
  id: number;
  author_name: string;
  created_at: string;
  user_id: number;
  content: string;
  /** 1이면 작성자 닉네임 대신 '익명'으로 표시 */
  is_anonymous?: number | boolean;
  is_withdrawn?: number | boolean;
  // 서버는 soft delete(deleted_at)로 삭제 댓글도 내용까지 그대로 내려준다.
  // 클라이언트가 "삭제된 댓글입니다"로 가려야 한다 (웹 동일).
  deleted_at?: string | null;
};

type Props = {
  replies: Reply[];
  myId?: number;
  postAuthorId?: number;
  /** 게시글이 익명으로 작성됐는지 — 글쓴이 댓글 이름 표기에 쓴다 (웹 동일) */
  postIsAnonymous?: number | boolean;
  onDeleteReply: (id: number) => void;
  onReportReply?: (id: number, userId: number, isWithdrawn: boolean) => void;
};

export default function CommentsSection({ replies, myId, postAuthorId, postIsAnonymous, onDeleteReply, onReportReply }: Props) {
  return (
    <View style={s.section}>
      {/* 삭제된 댓글은 개수에서 제외 (서버 comment_count와 동일 기준) */}
      <Text style={s.header}>댓글 {replies.filter((r) => !r.deleted_at).length}개</Text>

      {replies.length === 0 ? (
        <Text style={s.empty}>아직 댓글이 없습니다.</Text>
      ) : (
        replies.map((reply) => {
          const isAnonymousComment = !!reply.is_anonymous;
          const isPostAuthor = postAuthorId != null && reply.user_id === postAuthorId;
          // 익명 댓글이거나, 익명 게시글의 글쓴이 댓글이면 '익명' (웹 동일)
          const displayName =
            isAnonymousComment || (isPostAuthor && postIsAnonymous)
              ? '익명'
              : reply.is_withdrawn
                ? '탈퇴한 회원'
                : reply.author_name;
          // 익명 댓글에는 '글쓴이' 배지를 달지 않는다 —
          // 실명 게시글에서 글쓴이가 익명으로 달았을 때 배지가 신원을 노출하기 때문.
          const showAuthorBadge = isPostAuthor && !isAnonymousComment && !reply.is_withdrawn;

          return (
          <View key={reply.id} style={s.item}>
            <View style={s.itemHeader}>
              <View style={s.meta}>
                <Text style={s.author}>{displayName}</Text>
                {showAuthorBadge && (
                  <View style={s.authorBadge}>
                    <Text style={s.authorBadgeText}>글쓴이</Text>
                  </View>
                )}
                <Text style={s.date}>{formatDate(reply.created_at)}</Text>
              </View>
              {/* 삭제된 댓글에는 삭제/신고 액션을 노출하지 않는다 */}
              {reply.deleted_at ? null : myId === reply.user_id ? (
                <TouchableOpacity onPress={() => onDeleteReply(reply.id)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={14} color="#cbd5e1" />
                </TouchableOpacity>
              ) : (
                // 타인의 댓글 — 신고/차단 (App Store 1.2). 탈퇴 회원이면 시트에서 안내 표시
                onReportReply && (
                  <TouchableOpacity onPress={() => onReportReply(reply.id, reply.user_id, !!reply.is_withdrawn)} hitSlop={8}>
                    <Ionicons name="ellipsis-horizontal" size={16} color="#cbd5e1" />
                  </TouchableOpacity>
                )
              )}
            </View>
            {reply.deleted_at ? (
              <Text style={[s.content, s.deletedContent]}>삭제된 댓글입니다.</Text>
            ) : (
              <Text style={s.content}>{reply.content}</Text>
            )}
          </View>
          );
        })
      )}
      <View style={{ height: 16 }} />
    </View>
  );
}

const s = StyleSheet.create({
  section: { paddingHorizontal: 16, paddingTop: 16 },
  header: { fontSize: 18, fontWeight: '600', color: '#0f172a', marginBottom: 14 },
  empty: { color: '#94a3b8', fontSize: 16, textAlign: 'center', paddingVertical: 24 },
  item: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  itemHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  author: { fontSize: 14, fontWeight: '600', color: '#334155' },
  authorBadge: { backgroundColor: '#dbeafe', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  authorBadgeText: { fontSize: 11, fontWeight: '600', color: '#1d4ed8' },
  date: { fontSize: 12, color: '#94a3b8' },
  content: { fontSize: 14, color: '#475569', lineHeight: 23 },
  deletedContent: { color: '#94a3b8', fontStyle: 'italic' },
});
