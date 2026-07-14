import { apiClient } from '@/api/apiClient';
import type { JobPostingPayload } from '@/services/site/api';

export interface PayappRequestResult {
    payurl: string;  // WebView 로 열 결제 URL
    orderId: string; // 폴링용 주문 식별자
}

export interface PayappStatus {
    status: 'pending' | 'paid' | 'cancelled' | 'expired';
    siteId: number | null;
}

/**
 * PayApp 결제요청 — 공고 원문을 서버로 보내 대기 주문을 만들고 결제 URL을 받는다.
 * 금액/등급은 서버가 재확정하므로 payload.totalAmount 는 참고용.
 */
export async function requestPayapp(payload: JobPostingPayload): Promise<PayappRequestResult> {
    const { data } = await apiClient.post<PayappRequestResult>('/payapp/request', payload);
    return data;
}

/** 결제 상태 폴링 — 웹훅으로 서버가 확정하면 paid + siteId 가 채워진다. */
export async function getPayappStatus(orderId: string): Promise<PayappStatus> {
    const { data } = await apiClient.get<PayappStatus>(`/payapp/status/${orderId}`);
    return data;
}
