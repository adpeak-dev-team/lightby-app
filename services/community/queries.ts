import { useQuery } from '@tanstack/react-query';
import { getCommunityPosts, getCommunityPostById, getCommunityReplies } from './api';

export const COMMUNITY_KEYS = {
  posts: ['community', 'posts'] as const,
  post:  (id: number) => ['community', 'post', id] as const,
  replies: (id: number) => ['community', 'replies', id] as const,
};

export function useGetCommunityPosts() {
  return useQuery({
    queryKey: COMMUNITY_KEYS.posts,
    queryFn:  getCommunityPosts,
  });
}

export function useGetCommunityPostById(id: number) {
  return useQuery({
    queryKey: COMMUNITY_KEYS.post(id),
    queryFn:  () => getCommunityPostById(id),
    enabled: id > 0,
  });
}

export function useGetCommunityReplies(boardId: number) {
  return useQuery({
    queryKey: COMMUNITY_KEYS.replies(boardId),
    queryFn:  () => getCommunityReplies(boardId),
    enabled: boardId > 0,
  });
}
