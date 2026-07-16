import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toggleLike, createReply, deleteReply, deleteBoardPost, createCommunityPost, updateCommunityPost, updateCommunityPostImages, reportContent, blockUser, unblockUser } from './api';
import { COMMUNITY_KEYS } from './queries';
import type { CreateCommunityPostPayload } from './types';

export function useToggleLike(boardId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, userId }: { postId: number; userId: number }) =>
      toggleLike(postId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: COMMUNITY_KEYS.all });
      qc.invalidateQueries({ queryKey: COMMUNITY_KEYS.post(boardId) });
    },
  });
}

export function useCreateReply(boardId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ content, userId }: { content: string; userId: number }) =>
      createReply(boardId, content, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: COMMUNITY_KEYS.replies(boardId) });
      qc.invalidateQueries({ queryKey: COMMUNITY_KEYS.all });
      qc.invalidateQueries({ queryKey: COMMUNITY_KEYS.post(boardId) });
    },
  });
}

export function useDeleteReply(boardId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (replyId: number) => deleteReply(replyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: COMMUNITY_KEYS.replies(boardId) });
      qc.invalidateQueries({ queryKey: COMMUNITY_KEYS.all });
      qc.invalidateQueries({ queryKey: COMMUNITY_KEYS.post(boardId) });
    },
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, userId }: { postId: number; userId: number }) =>
      deleteBoardPost(postId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: COMMUNITY_KEYS.all }),
  });
}

export function useCreateCommunityPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCommunityPostPayload) => createCommunityPost(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: COMMUNITY_KEYS.all }),
  });
}

export function useUpdateCommunityPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { title: string; content: string; images: string[] } }) =>
      updateCommunityPost(id, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: COMMUNITY_KEYS.all });
      qc.invalidateQueries({ queryKey: COMMUNITY_KEYS.post(id) });
    },
  });
}

export function useUpdateCommunityPostImages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, images }: { id: number; images: string[] }) =>
      updateCommunityPostImages(id, images),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: COMMUNITY_KEYS.post(id) });
    },
  });
}

// ==================== 신고 / 차단 (App Store 1.2) ====================
export function useReportContent() {
  return useMutation({
    mutationFn: ({ reporterId, targetType, targetId, reason }:
      { reporterId: number; targetType: 'board' | 'reply' | 'site'; targetId: number; reason: string }) =>
      reportContent(reporterId, targetType, targetId, reason),
  });
}

export function useBlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ blockerId, blockedId }: { blockerId: number; blockedId: number }) =>
      blockUser(blockerId, blockedId),
    // 차단 즉시 피드/상세/댓글에서 해당 사용자 콘텐츠가 사라지도록 전체 무효화
    // 커뮤니티 + 구인공고 피드 모두 (구인공고도 차단자 공고 숨김 대상 — App Store 1.2)
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['community'] });
      qc.invalidateQueries({ queryKey: ['jobs'] });
      qc.invalidateQueries({ queryKey: ['jobs-free'] });
      qc.invalidateQueries({ queryKey: ['favorite-sites'] });
    },
  });
}

export function useUnblockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ blockerId, blockedId }: { blockerId: number; blockedId: number }) =>
      unblockUser(blockerId, blockedId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community'] }),
  });
}
