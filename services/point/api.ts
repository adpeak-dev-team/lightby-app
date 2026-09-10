import { apiClient } from '@/api/apiClient';
import type {
    PointBalance, PointHistoryPage, PointOrderStatus, PointPackageList, PointPolicy,
} from './types';

interface Envelope<T> {
    success: boolean;
    data: T;
}

export async function getPointBalance(): Promise<PointBalance> {
    const { data } = await apiClient.get<Envelope<PointBalance>>('/point/balance');
    return data.data;
}

/** 한 번에 가져오는 개수. 다음 페이지 유무를 이 값과 비교해 판단하므로 쿼리 쪽과 공유한다. */
export const POINT_HISTORY_PAGE_SIZE = 30;

/** cursor 는 마지막으로 받은 id. 시각이 같아도 안 밀리도록 id 기준으로 넘긴다. */
export async function getPointHistory(
    cursor?: number,
    limit = POINT_HISTORY_PAGE_SIZE,
): Promise<PointHistoryPage> {
    const { data } = await apiClient.get<Envelope<PointHistoryPage>>('/point/history', {
        params: { limit, ...(cursor ? { cursor } : {}) },
    });
    return data.data;
}

export async function getPointPolicies(): Promise<PointPolicy[]> {
    const { data } = await apiClient.get<Envelope<PointPolicy[]>>('/point/policies');
    return data.data;
}

export async function getPointPackages(): Promise<PointPackageList> {
    const { data } = await apiClient.get<Envelope<PointPackageList>>('/point/packages');
    return data.data;
}

/**
 * 충전 주문 생성 → PayApp 결제 URL.
 *
 * ⚠️ **안드로이드에서만 부른다.** iOS 는 디지털 재화를 애플 인앱결제로만 팔 수 있어
 *    이 경로를 태우면 심사에서 리젝된다(App Store 3.1.1).
 */
export async function requestPointCharge(packageCode: string): Promise<{
    payurl: string;
    orderId: string;
}> {
    const { data } = await apiClient.post<{ payurl: string; orderId: string }>(
        '/payapp/point/request',
        { packageCode },
    );
    return data;
}

/** 결제창을 닫은 뒤 확정됐는지 확인한다. 확정은 서버 웹훅이 한다. */
export async function getPointOrder(orderId: string): Promise<PointOrderStatus> {
    const { data } = await apiClient.get<Envelope<PointOrderStatus>>(`/point/orders/${orderId}`);
    return data.data;
}
