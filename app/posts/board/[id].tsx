import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Modal, StyleSheet,
  Share, ActivityIndicator, Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGetCommunityPostById, useGetCommunityReplies } from '@/services/community/queries';
import { useToggleLike, useCreateReply, useDeleteReply, useDeletePost } from '@/services/community/mutations';
import { checkLikeStatus, incrementCommunityView } from '@/services/community/api';
import { useGetMe } from '@/services/auth/queries';
import { toast } from '@/hooks/use-toast';

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

export default function BoardDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const postId = parseInt(id);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: post, isLoading: isPostLoading } = useGetCommunityPostById(postId);
  const { data: replies = [] } = useGetCommunityReplies(postId);
  const { data: me } = useGetMe();

  const toggleLikeMutation = useToggleLike(postId);
  const createReplyMutation = useCreateReply(postId);
  const deleteReplyMutation = useDeleteReply(postId);
  const deletePostMutation = useDeletePost();

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeInitialized, setLikeInitialized] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showUnlikeModal, setShowUnlikeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // 조회수 증가
  useEffect(() => {
    if (postId > 0) incrementCommunityView(postId).catch(() => null);
  }, [postId]);

  // 좋아요 수 동기화
  useEffect(() => {
    if (post?.likes !== undefined) setLikeCount(post.likes);
  }, [post?.likes]);

  // 좋아요 상태 확인
  useEffect(() => {
    if (!me?.id) { setLikeInitialized(true); return; }
    checkLikeStatus(postId, me.id)
      .then((r) => { setLiked(r.liked); setLikeInitialized(true); })
      .catch(() => setLikeInitialized(true));
  }, [postId, me?.id]);

  const handleShare = useCallback(() => {
    Share.share({ message: `https://lightby.co.kr/posts/board/${postId}` });
  }, [postId]);

  const handleLike = useCallback(() => {
    if (!me?.id) { toast.info('로그인이 필요한 서비스입니다.'); return; }
    if (liked) { setShowUnlikeModal(true); return; }
    toggleLikeMutation.mutate(
      { postId, userId: me.id },
      { onSuccess: () => { setLiked(true); setLikeCount((p) => p + 1); } }
    );
  }, [liked, me?.id, postId]);

  const handleConfirmUnlike = useCallback(() => {
    if (!me?.id) return;
    toggleLikeMutation.mutate(
      { postId, userId: me.id },
      {
        onSuccess: () => {
          setLiked(false);
          setLikeCount((p) => Math.max(0, p - 1));
          setShowUnlikeModal(false);
        },
      }
    );
  }, [me?.id, postId]);

  const handleAddReply = useCallback(() => {
    if (!me?.id) { toast.info('로그인이 필요한 서비스입니다.'); return; }
    const content = commentText.trim();
    if (!content) return;
    createReplyMutation.mutate(
      { content, userId: me.id },
      { onSuccess: () => setCommentText('') }
    );
  }, [commentText, me?.id]);

  const handleDeleteReply = useCallback((replyId: number) => {
    deleteReplyMutation.mutate(replyId);
  }, []);

  const handleDeletePost = useCallback(() => {
    if (!me?.id) return;
    deletePostMutation.mutate(
      { postId, userId: me.id },
      {
        onSuccess: () => {
          toast.success('게시글이 삭제되었습니다.');
          router.replace('/(tabs)/community');
        },
      }
    );
  }, [me?.id, postId]);

  const isOwner = !!me?.id && post?.user_id === me.id;

  if (isPostLoading) {
    return (
      <View style={[s.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={[s.centered, { paddingTop: insets.top }]}>
        <Text style={s.emptyText}>게시글을 찾을 수 없습니다.</Text>
      </View>
    );
  }

  const isAnon = !!post.is_anonymous;
  const profileUri = post.profile_thumbnail && !isAnon
    ? `${IMAGE_PREFIX}${post.profile_thumbnail}` : null;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* 네비게이션 */}
      <View style={s.navbar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={s.navBtn}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={s.navTitle}>게시글</Text>
        <View style={s.navRight}>
          {isOwner && (
            <TouchableOpacity onPress={() => setShowDeleteModal(true)} hitSlop={8} style={s.navBtn}>
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleShare} hitSlop={8} style={s.navBtn}>
            <Ionicons name="share-outline" size={22} color="#111827" />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
          {/* 작성자 */}
          <View style={s.authorSection}>
            <View style={s.avatarWrap}>
              {profileUri ? (
                <Image source={{ uri: profileUri }} style={s.avatar} contentFit="cover" />
              ) : (
                <Ionicons name="person-outline" size={18} color="#9ca3af" />
              )}
            </View>
            <View>
              <Text style={s.authorName}>{isAnon ? '익명' : post.nickname}</Text>
              <Text style={s.authorDate}>{formatDate(post.date)}</Text>
            </View>
          </View>

          {/* 제목 */}
          <View style={s.titleSection}>
            <Text style={s.postTitle}>{post.title}</Text>
          </View>

          {/* 이미지 */}
          {(post.image?.length ?? 0) > 0 && (
            <View style={s.imagesSection}>
              {post.image!.map((img, i) => (
                <Image
                  key={i}
                  source={{ uri: `${IMAGE_PREFIX}${img}` }}
                  style={s.postImage}
                  contentFit="cover"
                />
              ))}
            </View>
          )}

          {/* 본문 */}
          <View style={s.contentSection}>
            <Text style={s.postContent}>{post.content}</Text>
          </View>

          {/* 좋아요 */}
          <View style={s.likeSection}>
            <TouchableOpacity
              style={s.likeBtn}
              onPress={handleLike}
              disabled={!likeInitialized || toggleLikeMutation.isPending}
              activeOpacity={0.8}
            >
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={18}
                color={liked ? '#ef4444' : '#9ca3af'}
              />
              <Text style={[s.likeCount, liked && { color: '#ef4444' }]}>{likeCount}</Text>
            </TouchableOpacity>
          </View>

          {/* 구분선 */}
          <View style={s.separator} />

          {/* 댓글 */}
          <View style={s.commentsSection}>
            <Text style={s.commentsHeader}>댓글 {replies.length}개</Text>

            {replies.length === 0 ? (
              <Text style={s.noComments}>아직 댓글이 없습니다.</Text>
            ) : (
              replies.map((reply) => (
                <View key={reply.id} style={s.replyItem}>
                  <View style={s.replyHeader}>
                    <View style={s.replyMeta}>
                      <Text style={s.replyAuthor}>{reply.author_name}</Text>
                      <Text style={s.replyDate}>{formatDate(reply.created_at)}</Text>
                    </View>
                    {me?.id === reply.user_id && (
                      <TouchableOpacity onPress={() => handleDeleteReply(reply.id)} hitSlop={8}>
                        <Ionicons name="trash-outline" size={14} color="#d1d5db" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={s.replyContent}>{reply.content}</Text>
                </View>
              ))
            )}
            <View style={{ height: 16 }} />
          </View>
        </ScrollView>

        {/* 댓글 입력 */}
        <View style={[s.inputBar, { paddingBottom: insets.bottom || 12 }]}>
          <TextInput
            ref={inputRef}
            style={s.commentInput}
            value={commentText}
            onChangeText={setCommentText}
            placeholder={me ? '댓글을 입력해주세요...' : '로그인 후 댓글을 작성할 수 있습니다.'}
            placeholderTextColor="#9ca3af"
            editable={!!me}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[s.sendBtn, (!commentText.trim() || !me) && s.sendBtnDisabled]}
            onPress={handleAddReply}
            disabled={!commentText.trim() || !me || createReplyMutation.isPending}
          >
            <Ionicons name="send" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* 좋아요 취소 모달 */}
      <Modal visible={showUnlikeModal} transparent animationType="fade" onRequestClose={() => setShowUnlikeModal(false)}>
        <Pressable style={s.overlay} onPress={() => setShowUnlikeModal(false)} />
        <View style={s.modal}>
          <Text style={s.modalTitle}>좋아요 취소</Text>
          <Text style={s.modalSub}>좋아요를 취소하시겠습니까?</Text>
          <View style={s.modalBtns}>
            <TouchableOpacity style={s.modalBtnSecondary} onPress={() => setShowUnlikeModal(false)}>
              <Text style={s.modalBtnSecondaryText}>계속 좋아요</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.modalBtnDanger} onPress={handleConfirmUnlike}>
              <Text style={s.modalBtnDangerText}>취소하기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 게시글 삭제 모달 */}
      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <Pressable style={s.overlay} onPress={() => setShowDeleteModal(false)} />
        <View style={s.modal}>
          <Text style={s.modalTitle}>게시글 삭제</Text>
          <Text style={s.modalSub}>삭제 후에는 복구가 불가능합니다.</Text>
          <View style={s.modalBtns}>
            <TouchableOpacity style={s.modalBtnSecondary} onPress={() => setShowDeleteModal(false)}>
              <Text style={s.modalBtnSecondaryText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.modalBtnDanger}
              onPress={handleDeletePost}
              disabled={deletePostMutation.isPending}
            >
              <Text style={s.modalBtnDangerText}>
                {deletePostMutation.isPending ? '삭제 중...' : '삭제'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#9ca3af', fontSize: 15 },

  navbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  navBtn: { padding: 6 },
  navTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: '#111827' },
  navRight: { flexDirection: 'row', alignItems: 'center' },

  scroll: { flex: 1 },

  authorSection: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  avatarWrap: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatar: { width: '100%', height: '100%' },
  authorName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  authorDate: { fontSize: 11, color: '#9ca3af', marginTop: 2 },

  titleSection: { paddingHorizontal: 16, paddingBottom: 12 },
  postTitle: { fontSize: 19, fontWeight: '800', color: '#111827', lineHeight: 28 },

  imagesSection: { paddingHorizontal: 16, gap: 10, marginBottom: 4 },
  postImage: { width: '100%', height: 220, borderRadius: 12 },

  contentSection: { paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#f9fafb' },
  postContent: { fontSize: 15, color: '#374151', lineHeight: 25 },

  likeSection: { alignItems: 'center', paddingVertical: 20 },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: '#e5e7eb' },
  likeCount: { fontSize: 14, fontWeight: '600', color: '#6b7280' },

  separator: { height: 8, backgroundColor: '#f3f4f6' },

  commentsSection: { paddingHorizontal: 16, paddingTop: 16 },
  commentsHeader: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 14 },
  noComments: { color: '#9ca3af', fontSize: 14, textAlign: 'center', paddingVertical: 24 },
  replyItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  replyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  replyMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  replyAuthor: { fontSize: 13, fontWeight: '700', color: '#374151' },
  replyDate: { fontSize: 11, color: '#9ca3af' },
  replyContent: { fontSize: 14, color: '#4b5563', lineHeight: 21 },

  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6', backgroundColor: '#fff' },
  commentInput: { flex: 1, minHeight: 40, maxHeight: 100, backgroundColor: '#f9fafb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#111827', borderWidth: 1, borderColor: '#e5e7eb' },
  sendBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#0ea5e9', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#bae6fd' },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  modal: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 6 },
  modalSub: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginBottom: 22 },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalBtnSecondary: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center' },
  modalBtnSecondaryText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  modalBtnDanger: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#ef4444', alignItems: 'center' },
  modalBtnDangerText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
