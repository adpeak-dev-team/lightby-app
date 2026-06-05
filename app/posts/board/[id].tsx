import { useCallback, useEffect, useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, KeyboardAvoidingView, Modal, StyleSheet, Share, ActivityIndicator, Pressable,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useGetCommunityPostById, useGetCommunityReplies } from '@/services/community/queries';
import { useToggleLike, useCreateReply, useDeleteReply, useDeletePost } from '@/services/community/mutations';
import { checkLikeStatus, incrementCommunityView } from '@/services/community/api';
import { useGetMe } from '@/services/auth/queries';
import { toast } from '@/hooks/use-toast';
import { useKeyboardVisible } from '@/hooks/use-keyboard-visible';
import { IMAGE_PREFIX } from '@/lib/constants';
import { formatDate } from '@/lib/lib';
import PostTopNav from '@/components/common/PostTopNav';
import CommentsSection from '@/components/community-post/CommentsSection';
import CommentInputBar from '@/components/community-post/CommentInputBar';

function PostImage({ uri }: { uri: string }) {
  const [ratio, setRatio] = useState(1);
  return (
    <Image
      source={{ uri }}
      style={[s.postImage, { aspectRatio: ratio }]}
      contentFit="contain"
      onLoad={(e) => {
        const w = e.source?.width ?? 1;
        const h = e.source?.height ?? 1;
        if (w > 0 && h > 0) setRatio(w / h);
      }}
    />
  );
}

export default function BoardDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const postId = parseInt(id);
  const router = useRouter();
  const { bottom: bottomInset } = useSafeAreaInsets();

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

  const keyboardVisible = useKeyboardVisible();

  useEffect(() => {
    if (postId > 0) incrementCommunityView(postId).catch(() => null);
  }, [postId]);

  useEffect(() => {
    if (post?.likes !== undefined) setLikeCount(post.likes);
  }, [post?.likes]);

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
    // 옵티미스틱: 즉시 반영 후 실패 시 롤백
    setLiked(true);
    setLikeCount((p) => p + 1);
    toggleLikeMutation.mutate(
      { postId, userId: me.id },
      { onError: () => { setLiked(false); setLikeCount((p) => Math.max(0, p - 1)); toast.error('잠시 후 다시 시도해 주세요.'); } },
    );
  }, [liked, me?.id, postId]);

  const handleConfirmUnlike = useCallback(() => {
    if (!me?.id) return;
    setShowUnlikeModal(false);
    setLiked(false);
    setLikeCount((p) => Math.max(0, p - 1));
    toggleLikeMutation.mutate(
      { postId, userId: me.id },
      { onError: () => { setLiked(true); setLikeCount((p) => p + 1); toast.error('잠시 후 다시 시도해 주세요.'); } },
    );
  }, [me?.id, postId]);

  const handleAddReply = useCallback(() => {
    if (!me?.id) { toast.info('로그인이 필요한 서비스입니다.'); return; }
    const content = commentText.trim();
    if (!content) return;
    createReplyMutation.mutate(
      { content, userId: me.id },
      { onSuccess: () => setCommentText('') },
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
      },
    );
  }, [me?.id, postId]);

  const isOwner = !!me?.id && post?.user_id === me.id;

  if (isPostLoading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={s.centered}>
        <Text style={s.emptyText}>게시글을 찾을 수 없습니다.</Text>
      </View>
    );
  }

  const isAnon = !!post.is_anonymous;
  const profileUri = post.profile_thumbnail && !isAnon
    ? `${IMAGE_PREFIX}${post.profile_thumbnail}` : null;

  return (
    <View style={s.container}>
      <PostTopNav
        title="게시글"
        onBack={() => router.back()}
        rightActions={[
          ...(isOwner ? [
            { icon: 'pencil-outline', color: '#0ea5e9', onPress: () => router.push({ pathname: '/registration/communitypost-edit/[id]', params: { id } } as never) },
            { icon: 'trash-outline', color: '#ef4444', onPress: () => setShowDeleteModal(true) },
          ] : []),
          { icon: 'share-outline', onPress: handleShare },
        ]}
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
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
                <PostImage key={i} uri={`${IMAGE_PREFIX}${img}`} />
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

          <CommentsSection
            replies={replies}
            myId={me?.id}
            postAuthorId={post?.user_id}
            onDeleteReply={handleDeleteReply}
          />
        </ScrollView>

        <CommentInputBar
          value={commentText}
          onChange={setCommentText}
          onSubmit={handleAddReply}
          isLoggedIn={!!me}
          isSubmitting={createReplyMutation.isPending}
          keyboardVisible={keyboardVisible}
          bottomInset={bottomInset}
        />
      </KeyboardAvoidingView>
      <View style={{ height: keyboardVisible ? 0 : bottomInset }} />

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

  scroll: { flex: 1 },

  authorSection: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  avatarWrap: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatar: { width: '100%', height: '100%' },
  authorName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  authorDate: { fontSize: 11, color: '#9ca3af', marginTop: 2 },

  titleSection: { paddingHorizontal: 16, paddingBottom: 12 },
  postTitle: { fontSize: 19, fontWeight: '700', color: '#111827', lineHeight: 28 },

  imagesSection: { paddingHorizontal: 16, gap: 10, marginBottom: 4 },
  postImage: { width: '100%', borderRadius: 12, backgroundColor: '#f3f4f6' },

  contentSection: { paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#f9fafb' },
  postContent: { fontSize: 15, color: '#374151', lineHeight: 25 },

  likeSection: { alignItems: 'center', paddingVertical: 20 },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: '#e5e7eb' },
  likeCount: { fontSize: 14, fontWeight: '600', color: '#6b7280' },

  separator: { height: 8, backgroundColor: '#f3f4f6' },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  modal: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 6 },
  modalSub: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginBottom: 22 },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalBtnSecondary: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center' },
  modalBtnSecondaryText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  modalBtnDanger: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#ef4444', alignItems: 'center' },
  modalBtnDangerText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
