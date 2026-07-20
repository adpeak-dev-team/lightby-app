// 서버 notification-category.ts 와 동일하게 유지할 것
export const NOTIFICATION_CATEGORIES = ['apply', 'my_post', 'community', 'etc'] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
    apply: '지원',
    my_post: '내 공고',
    community: '커뮤니티',
    etc: '기타',
};

export interface NotificationItem {
    id: number;
    type: string;
    title: string;
    body: string;
    data: Record<string, any> | null;
    /** 서버가 type에서 파생해 내려준다 */
    category: NotificationCategory;
    readAt: string | null;
    createdAt: string;
}

export interface UnreadCountResult {
    count: number;
    byCategory: Record<NotificationCategory, number>;
}
