import {
  Modal, View, TouchableOpacity, FlatList, Image, ActivityIndicator, StyleSheet,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useGetMyRecentPosts } from '@/services/site/queries';
import { MyPostSummary } from '@/services/site/types';

const IMAGE_PREFIX = process.env.EXPO_PUBLIC_IMAGE_PREFIX ?? '';

interface Props {
    visible: boolean;
    onClose: () => void;
    onSelect: (post: MyPostSummary) => void;
    isLoading?: boolean;
}

export function PreviousPostingModal({ visible, onClose, onSelect, isLoading: outerLoading }: Props) {
    const { data: posts, isLoading } = useGetMyRecentPosts();
    console.log(posts)

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const yy = String(d.getFullYear()).slice(2);
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yy}.${mm}.${dd}`;
    };

    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
            <View style={s.overlay}>
                <View style={s.sheet}>
                    {/* 헤더 */}
                    <View style={s.header}>
                        <View style={s.headerLeft}>
                            <View style={s.headerBar} />
                            <Text style={s.headerTitle}>이전 등록 공고 불러오기</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} hitSlop={8}>
                            <Ionicons name="close" size={22} color="#9ca3af" />
                        </TouchableOpacity>
                    </View>

                    {/* 콘텐츠 */}
                    {isLoading ? (
                        <View style={s.center}>
                            <ActivityIndicator size="large" color="#0ea5e9" />
                        </View>
                    ) : !posts || posts.length === 0 ? (
                        <View style={s.center}>
                            <Ionicons name="folder-open-outline" size={52} color="#e5e7eb" />
                            <Text style={s.emptyText}>이전에 등록한 공고가 없습니다.</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={posts}
                            keyExtractor={(item) => String(item.id)}
                            contentContainerStyle={s.list}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={s.item}
                                    activeOpacity={0.75}
                                    onPress={() => { onSelect(item); onClose(); }}
                                    disabled={outerLoading}
                                >
                                    {/* 썸네일 */}
                                    <Image
                                        source={{ uri: item.thumbnail ? `${IMAGE_PREFIX}${item.thumbnail}` : undefined }}
                                        defaultSource={require('@/assets/images/alt_image.jpg')}
                                        style={s.thumb}
                                    />

                                    {/* 정보 */}
                                    <View style={s.info}>
                                        <Text style={s.subject} numberOfLines={2}>{item.subject}</Text>
                                        <View style={s.meta}>
                                            <View style={[s.badge, item.is_display ? s.badgeActive : s.badgeInactive]}>
                                                <Text style={[s.badgeText, item.is_display ? s.badgeTextActive : s.badgeTextInactive]}>
                                                    {item.is_display ? '진행중' : '마감'}
                                                </Text>
                                            </View>
                                            <Text style={s.date}>{formatDate(item.created_at)}</Text>
                                        </View>
                                    </View>

                                    {/* 불러오기 */}
                                    <Text style={s.loadText}>불러오기</Text>
                                </TouchableOpacity>
                            )}
                        />
                    )}

                    {/* 닫기 버튼 */}
                    <View style={s.footer}>
                        <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.8}>
                            <Text style={s.closeBtnText}>닫기</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    sheet: {
        backgroundColor: '#fff',
        borderRadius: 24,
        maxHeight: '75%',
        paddingBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 12,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerBar: { width: 4, height: 18, borderRadius: 2, backgroundColor: '#0ea5e9' },
    headerTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
    center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
    emptyText: { fontSize: 14, color: '#9ca3af' },
    list: { padding: 16, gap: 10 },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        backgroundColor: '#fff',
    },
    thumb: {
        width: 60,
        height: 60,
        borderRadius: 10,
        backgroundColor: '#f3f4f6',
    },
    info: { flex: 1, gap: 6 },
    subject: { fontSize: 13, fontWeight: '600', color: '#111827', lineHeight: 18 },
    meta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
    badgeActive: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
    badgeInactive: { backgroundColor: '#f3f4f6', borderColor: '#e5e7eb' },
    badgeText: { fontSize: 10, fontWeight: '700' },
    badgeTextActive: { color: '#2563eb' },
    badgeTextInactive: { color: '#9ca3af' },
    date: { fontSize: 11, color: '#9ca3af' },
    loadText: { fontSize: 11, fontWeight: '700', color: '#0ea5e9' },
    footer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
    closeBtn: {
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
    },
    closeBtnText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
});
