import { useMutation, useQueryClient } from '@tanstack/react-query';
import { markAsRead, markAllAsRead } from './api';
import { NOTIFICATION_KEYS } from './queries';

export function useMarkNotificationAsRead() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => markAsRead(id),
        onSettled: () => {
            // 카테고리별로 키가 나뉘므로 접두사(all)로 한 번에 무효화한다
            queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
            queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.unreadCount });
        },
    });
}

export function useMarkAllNotificationsAsRead() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => markAllAsRead(),
        onSettled: () => {
            // 카테고리별로 키가 나뉘므로 접두사(all)로 한 번에 무효화한다
            queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
            queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.unreadCount });
        },
    });
}
