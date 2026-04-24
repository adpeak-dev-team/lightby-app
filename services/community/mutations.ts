import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toggleLike, createReply, deleteReply, deleteBoardPost } from './api';
import { COMMUNITY_KEYS } from './queries';

export function useToggleLike(boardId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, userId }: { postId: number; userId: number }) =>
      toggleLike(postId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: COMMUNITY_KEYS.posts });
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
      qc.invalidateQueries({ queryKey: COMMUNITY_KEYS.posts });
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
      qc.invalidateQueries({ queryKey: COMMUNITY_KEYS.posts });
      qc.invalidateQueries({ queryKey: COMMUNITY_KEYS.post(boardId) });
    },
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, userId }: { postId: number; userId: number }) =>
      deleteBoardPost(postId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: COMMUNITY_KEYS.posts }),
  });
}
