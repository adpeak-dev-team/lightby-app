import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toggleLike, createReply, deleteReply, deleteBoardPost, createCommunityPost, updateCommunityPost, updateCommunityPostImages } from './api';
import { COMMUNITY_KEYS } from './queries';
import type { CreateCommunityPostPayload } from './types';

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

export function useCreateCommunityPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCommunityPostPayload) => createCommunityPost(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: COMMUNITY_KEYS.posts }),
  });
}

export function useUpdateCommunityPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { title: string; content: string; images: string[] } }) =>
      updateCommunityPost(id, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: COMMUNITY_KEYS.posts });
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
