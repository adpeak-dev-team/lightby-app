/** 잔액. enabled 가 false 면 포인트 기능이 통째로 꺼져 있다 — 화면을 그리지 않는다. */
export interface PointBalance {
    balance: number;
    /** 충전분. 환불 대상이 되는 몫 */
    paidBalance: number;
    /** 적립분. 소멸·회수 때 먼저 빠진다 */
    freeBalance: number;
    enabled: boolean;
}

/** 원장 한 줄. amount 가 양수면 받은 것, 음수면 쓴 것. */
export interface PointHistoryItem {
    id: number;
    amount: number;
    kind: 'paid' | 'free';
    /** '일반글 작성', '충전' 처럼 사람이 읽는 이름 */
    label: string;
    memo: string | null;
    balanceAfter: number;
    /** KST 'YYYY-MM-DD HH:mm:ss' — 서버가 문자열로 준다 */
    createdAt: string;
}

export interface PointHistoryPage {
    items: PointHistoryItem[];
    nextCursor: number | null;
}

/** 적립·사용 정책. 화면이 "100자 이상 쓰면 100P" 같은 안내를 만드는 데 쓴다. */
export interface PointPolicy {
    code: string;
    label: string;
    kind: 'spend' | 'earn';
    amount: number;
    allowFreePoint: boolean;
    dailyCountLimit: number | null;
    lifetimeCountLimit: number | null;
    bodyRule: 'none' | 'image_or_len' | 'len';
    minBodyLength: number | null;
    freeFirstCount: number | null;
    freeLeft: number;
}

export interface PointPackage {
    id: number;
    code: string;
    label: string;
    points: number;
    bonusPoints: number;
    priceWeb: number;
    priceAppDisplay: number | null;
    iosProductId: string | null;
}

export interface PointPackageList {
    /** 웹 충전(PayApp)이 켜져 있는가. 꺼져 있으면 빈 목록이 온다 */
    enabled: boolean;
    items: PointPackage[];
}

export interface PointOrderStatus {
    orderId: string;
    status: 'pending' | 'paid' | 'cancelled' | 'refunded' | 'expired';
    points: number;
}
