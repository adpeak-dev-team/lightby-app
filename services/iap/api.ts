import { apiClient } from '@/api/apiClient';

/** iOS 영수증을 백엔드로 보내 Apple 검증 + 결제 확정 */
export async function verifyIosReceipt(payload: { receipt: string; productId: string }) {
  const { data } = await apiClient.post('/iap/verify-ios', payload);
  return data as { success: boolean; transactionId?: string; productId?: string };
}
