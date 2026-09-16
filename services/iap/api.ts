import { Platform } from 'react-native';

import { apiClient } from '@/api/apiClient';
import type { JobPostingPayload } from '@/services/site/api';

interface Envelope<T> {
    success: boolean;
    data: T;
}

/** 서버가 만든 주문. orderId 를 스토어 결제에 실어 보낸다 */
export interface StoreOrder {
    orderId: string;
    productId: string;
}

export type StoreConfirmResult =
    | { kind: 'point'; fulfilled: true; points: number; alreadyProcessed: boolean }
    | { kind: 'post'; fulfilled: true; siteId: number; pointEarned: number; alreadyProcessed: boolean }
    | { kind: 'post'; fulfilled: false; message: string };

/** 서버가 아는 플랫폼 이름 */
export const STORE_PLATFORM = Platform.OS === 'ios' ? 'ios' : 'android';

export async function prepareStorePointOrder(packageCode: string): Promise<StoreOrder & { points: number }> {
    const { data } = await apiClient.post<Envelope<StoreOrder & { points: number }>>(
        '/iap/point/prepare',
        { platform: STORE_PLATFORM, packageCode },
    );
    return data.data;
}

/** 등록 가능 여부(금칙어·하루 건수·중복)를 결제 전에 서버가 전부 본다. 여기서 막히면 결제창을 안 연다. */
export async function prepareStorePostOrder(payload: JobPostingPayload): Promise<StoreOrder> {
    const { data } = await apiClient.post<Envelope<StoreOrder>>(
        '/iap/post/prepare',
        { ...payload, platform: STORE_PLATFORM },
    );
    return data.data;
}

/**
 * 결제 확정.
 * iOS 는 purchaseToken 에 서명 거래(JWS)를, 안드로이드는 구글 구매 토큰과 상품 ID 를 보낸다.
 */
export async function confirmStorePurchase(
    purchaseToken: string,
    productId: string,
): Promise<StoreConfirmResult> {
    const { data } = await apiClient.post<Envelope<StoreConfirmResult>>('/iap/confirm', {
        platform: STORE_PLATFORM,
        purchaseToken,
        productId,
    });
    return data.data;
}
