import { useQuery } from '@tanstack/react-query';
import { getCommunityPosts, getCommunityPostById, getCommunityReplies } from './api';

export const COMMUNITY_KEYS = {
  posts: (search?: string) => ['community', 'posts', search ?? ''] as const,
  post:  (id: number) => ['community', 'post', id] as const,
  replies: (id: number) => ['community', 'replies', id] as const,
};

export function useGetCommunityPosts(search?: string) {
  return useQuery({
    queryKey: COMMUNITY_KEYS.posts(search),
    queryFn:  () => getCommunityPosts(search),
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
