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
  is_withdrawn?: number | boolean;
};

type Props = {
  replies: Reply[];
  myId?: number;
  postAuthorId?: number;
  onDeleteReply: (id: number) => void;
};

export default function CommentsSection({ replies, myId, postAuthorId, onDeleteReply }: Props) {
  return (
    <View style={s.section}>
      <Text style={s.header}>댓글 {replies.length}개</Text>

      {replies.length === 0 ? (
        <Text style={s.empty}>아직 댓글이 없습니다.</Text>
      ) : (
        replies.map((reply) => (
          <View key={reply.id} style={s.item}>
            <View style={s.itemHeader}>
              <View style={s.meta}>
                <Text style={s.author}>{reply.is_withdrawn ? '탈퇴한 회원' : reply.author_name}</Text>
                {postAuthorId != null && reply.user_id === postAuthorId && !reply.is_withdrawn && (
                  <View style={s.authorBadge}>
                    <Text style={s.authorBadgeText}>글쓴이</Text>
                  </View>
                )}
                <Text style={s.date}>{formatDate(reply.created_at)}</Text>
              </View>
              {myId === reply.user_id && (
                <TouchableOpacity onPress={() => onDeleteReply(reply.id)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={14} color="#cbd5e1" />
                </TouchableOpacity>
              )}
            </View>
            <Text style={s.content}>{reply.content}</Text>
          </View>
        ))
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
});
