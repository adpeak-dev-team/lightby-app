import { apiClient } from '@/api/apiClient';
import type { JobPostingPayload } from '@/services/site/api';

interface Envelope<T> {
    success: boolean;
    data: T;
}

/** 서버가 만든 주문. orderId 를 StoreKit 의 appAccountToken 으로 넘긴다 */
export interface IosOrder {
    orderId: string;
    productId: string;
}

export type IosConfirmResult =
    | { kind: 'point'; fulfilled: true; points: number; alreadyProcessed: boolean }
    | { kind: 'post'; fulfilled: true; siteId: number; pointEarned: number; alreadyProcessed: boolean }
    | { kind: 'post'; fulfilled: false; message: string };

export async function prepareIosPointOrder(packageCode: string): Promise<IosOrder & { points: number }> {
    const { data } = await apiClient.post<Envelope<IosOrder & { points: number }>>(
        '/iap/ios/point/prepare',
        { packageCode },
    );
    return data.data;
}

/** 등록 가능 여부(금칙어·하루 건수·중복)를 결제 전에 서버가 전부 본다. 여기서 막히면 결제창을 안 연다. */
export async function prepareIosPostOrder(payload: JobPostingPayload): Promise<IosOrder> {
    const { data } = await apiClient.post<Envelope<IosOrder>>('/iap/ios/post/prepare', payload);
    return data.data;
}

export async function confirmIosTransaction(signedTransaction: string): Promise<IosConfirmResult> {
    const { data } = await apiClient.post<Envelope<IosConfirmResult>>(
        '/iap/ios/confirm',
        { signedTransaction },
    );
    return data.data;
}
