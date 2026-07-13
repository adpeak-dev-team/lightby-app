export interface NotificationItem {
    id: number;
    type: string;
    title: string;
    body: string;
    data: Record<string, any> | null;
    readAt: string | null;
    createdAt: string;
}
