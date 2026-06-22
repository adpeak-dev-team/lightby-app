import { Platform } from 'react-native';

/**
 * react-native-iap(v15, OpenIAP) 기반 iOS 인앱결제 래퍼.
 *
 * 사전 준비:
 *  1) App Store Connect 에 아래 ID로 "소비성(Consumable)" 인앱상품 생성 + 가격 티어
 *  2) App Store Connect > 앱 > App-Specific Shared Secret 발급
 *     → 백엔드 .env 에 APPLE_SHARED_SECRET=... (영수증 검증용)
 *  3) Expo Go 불가 — EAS Build dev client / TestFlight + 샌드박스 테스터로 테스트
 *  (RevenueCat 같은 외부 서비스/키 불필요 — 영수증 검증은 우리 백엔드 /api/iap/verify-ios)
 */

// Apple IAP는 고정가라 "기본가 + 아이콘"을 동적 합산할 수 없다.
// 아이콘은 최대 1개 선택이므로, 아이콘 포함 여부에 따른 조합 상품 4개로 구성한다.
// 가격은 App Store Connect의 각 상품에 설정된 값으로 청구된다 — 아래 주석은 오픈기념 50% 할인 정가(콘솔과 일치시킬 것).
export const IAP_PRODUCT_IDS = {
  PREMIUM: 'com.lightby.app.premium_post',            // 27,900
  PREMIUM_ICON: 'com.lightby.app.premium_post_icon',  // 30,100 (아이콘 1개 포함)
  TOP: 'com.lightby.app.top_post',                    // 13,900
  TOP_ICON: 'com.lightby.app.top_post_icon',          // 16,100 (아이콘 1개 포함)
} as const;

/** 상품 등급 + 아이콘 선택 수로 실제 결제할 IAP 제품 ID를 결정 */
export function resolveProductId(tier: 'PREMIUM' | 'TOP', iconCount: number): string {
  const hasIcon = iconCount > 0;
  if (tier === 'PREMIUM') return hasIcon ? IAP_PRODUCT_IDS.PREMIUM_ICON : IAP_PRODUCT_IDS.PREMIUM;
  return hasIcon ? IAP_PRODUCT_IDS.TOP_ICON : IAP_PRODUCT_IDS.TOP;
}

// 현재는 iOS만 지원 (Android는 추후 Google Play Billing 연동)
export function isIAPSupported() {
  return Platform.OS === 'ios';
}

// web/네이티브 모듈 미존재 환경에서 안전하게 로드
function getIAP(): any | null {
  if (Platform.OS === 'web') return null;
  try {
    return require('react-native-iap');
  } catch {
    return null;
  }
}

let connected = false;
let updateSub: any = null;
let errorSub: any = null;
let pending: { resolve: (p: any) => void; reject: (e: any) => void; sku: string } | null = null;

/** 앱 시작 시 1회 호출 — 스토어 연결 + 구매 결과 리스너 등록 */
export async function initIAP() {
  const IAP = getIAP();
  if (!IAP || Platform.OS === 'web' || connected) return;
  try {
    await IAP.initConnection();
    connected = true;
    updateSub = IAP.purchaseUpdatedListener((purchase: any) => {
      const id = purchase?.productId ?? purchase?.id;
      if (pending && (!pending.sku || id === pending.sku)) {
        const p = pending; pending = null; p.resolve(purchase);
      }
    });
    errorSub = IAP.purchaseErrorListener((err: any) => {
      if (pending) { const p = pending; pending = null; p.reject(err); }
    });
  } catch {
    // 연결 실패 — 구매 시도 시 다시 throw 됨
  }
}

export interface IAPPurchase {
  purchase: any;
  jws: string; // StoreKit2 서명 거래(purchaseToken) — 백엔드가 Apple 서명 검증
}

/** 소비성 상품 구매. 성공 시 purchase + JWS(purchaseToken) 반환. 이벤트 기반이라 리스너로 결과 수신. */
export async function purchaseProduct(productId: string): Promise<IAPPurchase> {
  const IAP = getIAP();
  if (!IAP) throw new Error('IAP를 사용할 수 없는 환경입니다.');
  await initIAP();

  // 상품 메타 로드(필수)
  try { await IAP.fetchProducts({ skus: [productId], type: 'in-app' }); } catch { /* noop */ }

  const purchase = await new Promise<any>((resolve, reject) => {
    pending = { resolve, reject, sku: productId };
    IAP.requestPurchase({ request: { apple: { sku: productId } }, type: 'in-app' })
      .catch((e: any) => { pending = null; reject(e); });
  });

  // StoreKit2 통합 토큰(iOS=JWS). 백엔드가 Apple 루트 인증서로 서명 검증한다.
  const jws: string = purchase?.purchaseToken ?? '';
  return { purchase, jws };
}

/** 백엔드 영수증 검증 성공 후 호출 — 소비성 거래 완료(같은 상품 재구매 가능) */
export async function finishIAPTransaction(purchase: any) {
  const IAP = getIAP();
  if (!IAP) return;
  try { await IAP.finishTransaction({ purchase, isConsumable: true }); } catch { /* noop */ }
}

/** 사용자가 결제를 취소한 에러인지 */
export function isUserCancelled(err: any): boolean {
  const IAP = getIAP();
  try { if (IAP?.isUserCancelledError) return IAP.isUserCancelledError(err); } catch { /* noop */ }
  return err?.code === 'E_USER_CANCELLED' || /cancel/i.test(err?.message ?? '');
}
