import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getCommunityPosts, getCommunityPostById, getCommunityReplies, getBlockedUsers } from './api';

const PAGE_SIZE = 10;

export const COMMUNITY_KEYS = {
  // 검색어와 무관하게 모든 목록을 무효화할 때 쓰는 prefix
  all: ['community', 'posts'] as const,
  posts: (search?: string, category?: string) => ['community', 'posts', search ?? '', category ?? ''] as const,
  post:  (id: number) => ['community', 'post', id] as const,
  replies: (id: number) => ['community', 'replies', id] as const,
};

// viewerId: 로그인 사용자 id — 차단한 사용자의 콘텐츠를 서버에서 걸러내기 위해 전달.
// viewerId를 쿼리 키에 포함해야 me 로드 전(undefined)에 받은 미필터 결과가 캐시에 굳지 않는다.
// enabled: me(로그인 정보)가 확정되기 전에는 조회를 미뤄 차단 콘텐츠가 잠깐 노출되는 것을 막는다.
export function useGetCommunityPosts(search?: string, category?: string, viewerId?: number, enabled = true) {
  return useInfiniteQuery({
    queryKey: [...COMMUNITY_KEYS.posts(search, category), viewerId ?? null],
    queryFn:  ({ pageParam }) => getCommunityPosts(search, category, pageParam, PAGE_SIZE, viewerId),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    enabled,
  });
}

export function useGetCommunityPostById(id: number, viewerId?: number, enabled = true) {
  return useQuery({
    queryKey: [...COMMUNITY_KEYS.post(id), viewerId ?? null],
    queryFn:  () => getCommunityPostById(id, viewerId),
    enabled: id > 0 && enabled,
  });
}

export function useGetCommunityReplies(boardId: number, viewerId?: number, enabled = true) {
  return useQuery({
    queryKey: [...COMMUNITY_KEYS.replies(boardId), viewerId ?? null],
    queryFn:  () => getCommunityReplies(boardId, viewerId),
    enabled: boardId > 0 && enabled,
  });
}

// 내가 차단한 사용자 목록
export function useGetBlockedUsers(userId?: number) {
  return useQuery({
    queryKey: ['community', 'blocks', userId],
    queryFn:  () => getBlockedUsers(userId as number),
    enabled: !!userId,
  });
}
