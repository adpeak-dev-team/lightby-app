import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { CommunityItem } from '@/services/community/types';

const IMAGE_PREFIX = process.env.EXPO_PUBLIC_IMAGE_PREFIX ?? '';

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const y = d.getFullYear().toString().slice(2);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}`;
}

interface Props {
  item: CommunityItem;
  onPress: () => void;
}

export function CommunityCard({ item, onPress }: Props) {
  const isAnon = !!item.is_anonymous;
  const thumbUri = item.thumbnail && !isAnon ? `${IMAGE_PREFIX}${item.thumbnail}` : null;
  const profileUri = item.profile_thumbnail && !isAnon ? `${IMAGE_PREFIX}${item.profile_thumbnail}` : null;

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.85}>
      <View style={s.body}>
        <View style={s.textBlock}>
          <Text style={s.title} numberOfLines={2}>{item.title}</Text>
          <Text style={s.content} numberOfLines={2}>{item.content}</Text>
        </View>

        {thumbUri && (
          <Image source={{ uri: thumbUri }} style={s.thumb} contentFit="cover" />
        )}
      </View>

      <View style={s.divider} />

      <View style={s.footer}>
        <View style={s.authorRow}>
          <View style={s.avatar}>
            {profileUri ? (
              <Image source={{ uri: profileUri }} style={s.avatarImg} contentFit="cover" />
            ) : (
              <Ionicons name="person-outline" size={13} color="#9ca3af" />
            )}
          </View>
          <Text style={s.authorText}>{isAnon ? '익명' : item.nickname}</Text>
          <Text style={s.dot}>·</Text>
          <Text style={s.dateText}>{formatDate(item.date)}</Text>
        </View>

        <View style={s.statsRow}>
          <View style={s.stat}>
            <Ionicons name="heart-outline" size={13} color="#ef4444" />
            <Text style={[s.statNum, { color: '#ef4444' }]}>{item.likes || 0}</Text>
          </View>
          <View style={s.stat}>
            <Ionicons name="chatbubble-outline" size={13} color="#3b82f6" />
            <Text style={[s.statNum, { color: '#3b82f6' }]}>{item.comments || 0}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  body: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  textBlock: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 22,
  },
  content: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 19,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 10,
    flexShrink: 0,
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginBottom: 10,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  authorText: {
    fontSize: 12,
    color: '#6b7280',
  },
  dot: {
    fontSize: 11,
    color: '#d1d5db',
  },
  dateText: {
    fontSize: 11,
    color: '#9ca3af',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statNum: {
    fontSize: 12,
    fontWeight: '600',
  },
});
