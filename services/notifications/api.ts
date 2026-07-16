import { apiClient } from '@/api/apiClient';
import type { NotificationItem } from './types';

export async function getNotifications(params: { limit?: number; offset?: number } = {}): Promise<NotificationItem[]> {
    const res = await apiClient.get<{ success: boolean; data: NotificationItem[] }>('/notifications', {
        params: { limit: params.limit ?? 30, offset: params.offset ?? 0 },
    });
    return res.data.data;
}

export async function getUnreadCount(): Promise<number> {
    const res = await apiClient.get<{ success: boolean; data: { count: number } }>('/notifications/unread-count');
    return res.data.data.count;
}

export async function markAsRead(id: number): Promise<void> {
    await apiClient.patch(`/notifications/${id}/read`);
}

export async function markAllAsRead(): Promise<void> {
    await apiClient.patch('/notifications/read-all');
}
