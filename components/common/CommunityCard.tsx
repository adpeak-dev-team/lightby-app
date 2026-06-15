import {
  View, TouchableOpacity, StyleSheet,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { CommunityItem } from '@/services/community/types';
import { Colors, Radius, flatCard } from '@/lib/theme';
import { COMMUNITY_CATEGORY_LABELS, CommunityCategory } from '@/lib/communityCategory';

function isCommunityCategory(v: unknown): v is CommunityCategory {
  return v === 'notice' || v === 'news';
}

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
          <View style={s.titleRow}>
            {isCommunityCategory(item.category) && (
              <View style={[s.catBadge, item.category === 'notice' ? s.catNotice : s.catNews]}>
                <Text style={[s.catText, item.category === 'notice' ? s.catTextNotice : s.catTextNews]}>
                  {COMMUNITY_CATEGORY_LABELS[item.category]}
                </Text>
              </View>
            )}
            <Text style={s.title} numberOfLines={2}>{item.title}</Text>
          </View>
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
              <Ionicons name="person-outline" size={13} color="#94a3b8" />
            )}
          </View>
          <Text style={s.authorText}>{isAnon ? '익명' : item.is_withdrawn ? '탈퇴한 회원' : item.nickname}</Text>
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
    // 웹과 동일하게 그림자 없는 평면 카드 + 보더로 구분
    ...flatCard,
    borderRadius: Radius.xl,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 10,
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  // 카테고리 배지 (공지=rose-100/500, 뉴스=primary-100/500)
  catBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  catNotice: { backgroundColor: '#ffe4e6' }, // rose-100
  catNews: { backgroundColor: '#dbeafe' }, // primary-100
  catText: { fontSize: 11, fontWeight: '700' },
  catTextNotice: { color: '#f43f5e' }, // rose-500
  catTextNews: { color: '#3b82f6' }, // primary-500
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 22,
  },
  content: {
    fontSize: 14,
    color: '#64748b',
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
    backgroundColor: '#f1f5f9',
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
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  authorText: {
    fontSize: 14,
    color: '#64748b',
  },
  dot: {
    fontSize: 12,
    color: '#cbd5e1',
  },
  dateText: {
    fontSize: 12,
    color: '#94a3b8',
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
    fontSize: 14,
    fontWeight: '400',
  },
});
