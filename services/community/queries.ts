import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getCommunityPosts, getCommunityPostById, getCommunityReplies } from './api';

const PAGE_SIZE = 10;

export const COMMUNITY_KEYS = {
  // 검색어와 무관하게 모든 목록을 무효화할 때 쓰는 prefix
  all: ['community', 'posts'] as const,
  posts: (search?: string) => ['community', 'posts', search ?? ''] as const,
  post:  (id: number) => ['community', 'post', id] as const,
  replies: (id: number) => ['community', 'replies', id] as const,
};

export function useGetCommunityPosts(search?: string) {
  return useInfiniteQuery({
    queryKey: COMMUNITY_KEYS.posts(search),
    queryFn:  ({ pageParam }) => getCommunityPosts(search, pageParam, PAGE_SIZE),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
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
