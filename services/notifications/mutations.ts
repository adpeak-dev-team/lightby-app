import { useMutation, useQueryClient } from '@tanstack/react-query';
import { markAsRead, markAllAsRead } from './api';
import { NOTIFICATION_KEYS } from './queries';

export function useMarkNotificationAsRead() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => markAsRead(id),
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.list });
            queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.unreadCount });
        },
    });
}

export function useMarkAllNotificationsAsRead() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => markAllAsRead(),
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.list });
            queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.unreadCount });
        },
    });
}
