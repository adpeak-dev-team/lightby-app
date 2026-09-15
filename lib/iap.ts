import { Platform } from 'react-native';
import type { Purchase } from 'expo-iap';

import { confirmIosTransaction, type IosConfirmResult, type IosOrder } from '@/services/iap/api';

/**
 * iOS 인앱결제 (StoreKit 2, expo-iap).
 *
 * ── 흐름 ──
 * 1) 서버에 주문을 만든다(prepare) → { orderId, productId }
 * 2) orderId 를 appAccountToken 으로 넣어 결제한다. Apple 이 서명한 거래에 그 값이 들어간다.
 * 3) 거래(JWS)를 서버로 보내 확정한다(confirm). 서버가 주문을 찾아 포인트·공고를 처리한다.
 * 4) **서버가 성공을 확인한 뒤에만** finishTransaction 한다.
 *
 * 끝내지 않은 거래는 Apple 이 앱을 켤 때마다 다시 준다. 결제 직후 앱이 꺼지거나 네트워크가
 * 끊겨도 다음 실행 때 recoverUnfinished() 가 3)부터 이어간다.
 *
 * 안드로이드에서는 모듈이 아예 링크되지 않는다(package.json expo.autolinking) — 그래서
 * import 대신 iOS 에서만 require 한다. 안드로이드 결제는 PayApp 이다.
 */
const IAP: typeof import('expo-iap') | null = Platform.OS === 'ios' ? require('expo-iap') : null;

export const isIapAvailable = IAP !== null;

/** 다시 보내도 결과가 같은 서버 거절(백엔드 ErrorCode 30001~30004) — 거래를 끝내도 된다 */
const FINISHABLE_ERROR_CODES = ['30001', '30002', '30003', '30004'];

export class IapError extends Error {
    constructor(
        message: string,
        /** cancelled: 사용자가 닫음 / pending: 승인 대기(자녀 구매 요청 등) / failed: 그 외 */
        readonly kind: 'cancelled' | 'pending' | 'failed',
    ) {
        super(message);
    }
}

let connected: Promise<unknown> | null = null;
function connect() {
    if (!IAP) throw new IapError('이 기기에서는 인앱결제를 사용할 수 없습니다.', 'failed');
    connected ??= IAP.initConnection().catch((e) => {
        connected = null;   // 다음 호출에서 다시 시도
        throw e;
    });
    return connected;
}

/** 상품 ID → App Store 표시 가격('₩13,900'). Apple 가격을 그대로 보여줘야 한다(심사 요건). */
export async function loadIosPrices(productIds: string[]): Promise<Record<string, string>> {
    if (!IAP || productIds.length === 0) return {};
    await connect();
    const products = (await IAP.fetchProducts({ skus: productIds, type: 'in-app' })) ?? [];
    const out: Record<string, string> = {};
    for (const p of products as { id: string; displayPrice: string }[]) out[p.id] = p.displayPrice;
    return out;
}

// ── 거래 처리 ──

/** 같은 거래가 requestPurchase 반환값과 리스너로 두 번 올 수 있다 — 한 번만 서버로 보낸다 */
const inflight = new Map<string, Promise<IosConfirmResult>>();

function handlePurchase(purchase: Purchase): Promise<IosConfirmResult> {
    const key = purchase.id;
    let p = inflight.get(key);
    if (!p) {
        p = confirmAndFinish(purchase).finally(() => inflight.delete(key));
        inflight.set(key, p);
    }
    return p;
}

async function confirmAndFinish(purchase: Purchase): Promise<IosConfirmResult> {
    if (!IAP) throw new IapError('인앱결제를 사용할 수 없습니다.', 'failed');
    if (purchase.purchaseState === 'pending') {
        throw new IapError('결제 승인을 기다리고 있습니다. 승인되면 자동으로 반영됩니다.', 'pending');
    }
    if (!purchase.purchaseToken) {
        throw new IapError('결제 정보를 받지 못했습니다. 잠시 후 다시 시도해 주세요.', 'failed');
    }

    try {
        const result = await confirmIosTransaction(purchase.purchaseToken);
        await IAP.finishTransaction({ purchase, isConsumable: true });
        return result;
    } catch (e: any) {
        const data = e?.response?.data;
        if (data && FINISHABLE_ERROR_CODES.includes(String(data.errorCode))) {
            // 다시 보내도 같은 결과 — 거래를 끝내 매번 되살아나지 않게 한다
            await IAP.finishTransaction({ purchase, isConsumable: true }).catch(() => { });
            throw new IapError(data.message ?? '결제를 처리하지 못했습니다.', 'failed');
        }
        // 네트워크·서버 오류·로그인 만료 — 거래를 남겨 두면 다음 실행 때 다시 시도된다
        throw new IapError(
            data?.message ?? '결제는 완료되었습니다. 반영이 늦어지고 있어 앱을 다시 열면 자동으로 처리됩니다.',
            'failed',
        );
    }
}

/**
 * 결제한다. 주문은 호출부가 서버에서 먼저 만든다(prepareIos...Order).
 * 서버 확정까지 끝난 결과를 돌려준다.
 */
export async function purchaseIos(order: IosOrder): Promise<IosConfirmResult> {
    if (!IAP) throw new IapError('이 기기에서는 인앱결제를 사용할 수 없습니다.', 'failed');
    await connect();

    // 상품을 한 번 불러와야 StoreKit 이 결제를 받는다
    const found = await IAP.fetchProducts({ skus: [order.productId], type: 'in-app' });
    if (!found || (found as unknown[]).length === 0) {
        throw new IapError('판매 중인 상품을 찾을 수 없습니다. 잠시 후 다시 시도해 주세요.', 'failed');
    }

    return new Promise<IosConfirmResult>((resolve, reject) => {
        let settled = false;
        const done = (fn: () => void) => {
            if (settled) return;
            settled = true;
            updated.remove();
            failed.remove();
            fn();
        };

        const updated = IAP.purchaseUpdatedListener((purchase) => {
            if (purchase.productId !== order.productId) return;
            const token = (purchase as { appAccountToken?: string | null }).appAccountToken;
            if (token && token.toLowerCase() !== order.orderId.toLowerCase()) return;
            handlePurchase(purchase).then(
                (r) => done(() => resolve(r)),
                (e) => done(() => reject(e)),
            );
        });

        const failed = IAP.purchaseErrorListener((error) => {
            const code = String(error?.code ?? '');
            if (code === IAP.ErrorCode.UserCancelled) {
                done(() => reject(new IapError('결제를 취소했습니다.', 'cancelled')));
            } else if (code === IAP.ErrorCode.DeferredPayment || code === IAP.ErrorCode.Pending) {
                done(() => reject(new IapError('결제 승인을 기다리고 있습니다. 승인되면 자동으로 반영됩니다.', 'pending')));
            } else {
                done(() => reject(new IapError(error?.message || '결제에 실패했습니다.', 'failed')));
            }
        });

        IAP.requestPurchase({
            request: { apple: { sku: order.productId, appAccountToken: order.orderId } },
            type: 'in-app',
        })
            .then((result) => {
                // 반환값으로 거래가 오는 경우도 있다. 리스너와 겹쳐도 handlePurchase 가 한 번만 보낸다
                const purchase = Array.isArray(result) ? result[0] : result;
                if (purchase && purchase.productId === order.productId) {
                    handlePurchase(purchase).then(
                        (r) => done(() => resolve(r)),
                        (e) => done(() => reject(e)),
                    );
                }
            })
            .catch((e: any) => {
                const code = String(e?.code ?? '');
                if (code === IAP.ErrorCode.UserCancelled) {
                    done(() => reject(new IapError('결제를 취소했습니다.', 'cancelled')));
                } else {
                    done(() => reject(new IapError(e?.message || '결제에 실패했습니다.', 'failed')));
                }
            });
    });
}

/**
 * 끝나지 않은 거래를 서버로 보내 마무리한다. 앱 시작·로그인 직후·충전 화면 진입 때 부른다.
 * 실패해도 조용히 넘어간다 — 거래가 남아 있어 다음에 다시 시도된다.
 */
let recovering = false;
export async function recoverUnfinished(): Promise<IosConfirmResult[]> {
    if (!IAP || recovering) return [];
    recovering = true;
    try {
        await connect();
        const pending = (await IAP.getPendingTransactionsIOS()) ?? [];
        const results: IosConfirmResult[] = [];
        for (const purchase of pending as Purchase[]) {
            try {
                results.push(await handlePurchase(purchase));
            } catch {
                /* 다음 기회에 */
            }
        }
        return results;
    } catch {
        return [];
    } finally {
        recovering = false;
    }
}
