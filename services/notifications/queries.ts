import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getNotifications, getUnreadCount } from './api';

const PAGE_SIZE = 30;

export const NOTIFICATION_KEYS = {
    list: ['notifications', 'list'] as const,
    unreadCount: ['notifications', 'unread-count'] as const,
};

export function useGetNotifications(enabled = true) {
    return useInfiniteQuery({
        queryKey: NOTIFICATION_KEYS.list,
        queryFn: ({ pageParam }) =>
            getNotifications({ limit: PAGE_SIZE, offset: (pageParam as number) * PAGE_SIZE }),
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
