import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getNotifications, getUnreadCount } from './api';
import type { NotificationCategory } from './types';

const PAGE_SIZE = 30;

export const NOTIFICATION_KEYS = {
    all: ['notifications'] as const,
    // 카테고리별로 캐시를 분리한다 (탭 전환 시 서로 섞이면 안 됨)
    list: (category?: NotificationCategory) => ['notifications', 'list', category ?? 'all'] as const,
    unreadCount: ['notifications', 'unread-count'] as const,
};

export function useGetNotifications(enabled = true, category?: NotificationCategory) {
    return useInfiniteQuery({
        queryKey: NOTIFICATION_KEYS.list(category),
        queryFn: ({ pageParam }) =>
            getNotifications({ limit: PAGE_SIZE, offset: (pageParam as number) * PAGE_SIZE, category }),
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) =>
            lastPage.length < PAGE_SIZE ? undefined : allPages.length,
        enabled,
    });
}

export function useGetUnreadCount(enabled = true) {
    return useQuery({
        queryKey: NOTIFICATION_KEYS.unreadCount,
        queryFn: getUnreadCount,
        enabled,
        staleTime: 30_000,
    });
}
