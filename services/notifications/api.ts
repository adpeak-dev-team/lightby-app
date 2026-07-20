import { apiClient } from '@/api/apiClient';
import type { NotificationCategory, NotificationItem, UnreadCountResult } from './types';

export async function getNotifications(
    params: { limit?: number; offset?: number; category?: NotificationCategory } = {},
): Promise<NotificationItem[]> {
    const res = await apiClient.get<{ success: boolean; data: NotificationItem[] }>('/notifications', {
        params: {
            limit: params.limit ?? 30,
            offset: params.offset ?? 0,
            // category 미지정이면 전체 조회
            ...(params.category ? { category: params.category } : {}),
        },
    });
    return res.data.data;
}

export async function getUnreadCount(): Promise<UnreadCountResult> {
    const res = await apiClient.get<{ success: boolean; data: UnreadCountResult }>('/notifications/unread-count');
    const data = res.data.data;
    return {
        count: data?.count ?? 0,
        // 구버전 서버 호환 — byCategory가 없으면 0으로 채운다
        byCategory: data?.byCategory ?? { apply: 0, my_post: 0, community: 0, etc: 0 },
    };
}

export async function markAsRead(id: number): Promise<void> {
    await apiClient.patch(`/notifications/${id}/read`);
}

export async function markAllAsRead(): Promise<void> {
    await apiClient.patch('/notifications/read-all');
}
