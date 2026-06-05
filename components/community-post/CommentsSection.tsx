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
};

type Props = {
  replies: Reply[];
  myId?: number;
  onDeleteReply: (id: number) => void;
};

export default function CommentsSection({ replies, myId, onDeleteReply }: Props) {
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
                <Text style={s.author}>{reply.author_name}</Text>
                <Text style={s.date}>{formatDate(reply.created_at)}</Text>
              </View>
              {myId === reply.user_id && (
                <TouchableOpacity onPress={() => onDeleteReply(reply.id)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={14} color="#d1d5db" />
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
  header: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 14 },
  empty: { color: '#9ca3af', fontSize: 14, textAlign: 'center', paddingVertical: 24 },
  item: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  itemHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  author: { fontSize: 13, fontWeight: '700', color: '#374151' },
  date: { fontSize: 11, color: '#9ca3af' },
  content: { fontSize: 14, color: '#4b5563', lineHeight: 21 },
});
