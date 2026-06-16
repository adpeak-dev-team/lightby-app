# iOS 인앱결제(IAP) 출시 체크리스트

서버 검증 코드는 구현 완료(StoreKit2 JWS → Apple 서명 검증 → `site_payment` 기록, 멱등성).
**실제로 결제가 되려면 아래 설정 + 실기기 테스트가 필요합니다.** (코드로 안 되는 부분)

---

## 1. App Store Connect — 인앱상품 4개 생성 (소비성/Consumable)

상품 ID는 코드와 **정확히 일치**해야 합니다 (`lib/iap.ts`).

| 상품 ID | 종류 | 가격(예시) | 설명 |
|---|---|---|---|
| `com.lightby.app.premium_post` | 소비성 | 66,000원 | 프리미엄 공고 |
| `com.lightby.app.premium_post_icon` | 소비성 | 68,200원 | 프리미엄 + 아이콘 1개 |
| `com.lightby.app.top_post` | 소비성 | 49,500원 | 지역 탑 공고 |
| `com.lightby.app.top_post_icon` | 소비성 | 51,700원 | 지역 탑 + 아이콘 1개 |

- 각 상품 "심사를 위한 메타데이터"(이름/설명/스크린샷) 작성 → 상태가 "제출 준비 완료"가 돼야 샌드박스에서 로드됨.

## 2. 유료 앱 계약 / 세금 / 은행 정보
- App Store Connect → **계약, 세금 및 금융 거래** → "유료 앱(Paid Apps)" 계약 활성화 + 은행/세금 정보 입력.
- **이게 없으면 인앱상품이 앱에서 로드되지 않습니다.**

## 3. 샌드박스 테스터 계정
- App Store Connect → 사용자 및 액세스 → **Sandbox 테스터** 추가(실제 안 쓰는 이메일).
- 실기기 설정 → App Store → (로그아웃 상태에서) 결제 시 샌드박스 계정으로 로그인.

## 4. appAppleId 확인 (서버 운영 검증용)
- App Store Connect → 앱 → **앱 정보** → "Apple ID"의 **숫자값** 확인 (예: 1234567890).

---

## 5. 서버 환경변수 (백엔드 담당자)

운영 서버 `.env` / 환경변수에 추가:

```
APPLE_APP_APPLE_ID=<위 4번의 숫자 앱ID>    # 운영(Production) 거래 검증에 필수
APPLE_BUNDLE_ID=com.lightby.app            # (기본값 있음, 확인용)
```

- `APPLE_APP_APPLE_ID` 미설정 시 **샌드박스 거래만** 검증됩니다(테스트는 가능, 운영 결제는 실패).
- `.p8` 비공개키 / Issuer ID / Key ID는 **현재 불필요** (오프라인 서명 검증 방식). 환불·서버 알림까지 받으려면 추후 추가.
- 배포 후 **백엔드 재빌드 + 재시작** 필요.

---

## 6. 앱 네이티브 빌드 (필수)

`react-native-iap`(+ nitro-modules)는 네이티브 모듈이라 **Expo Go / JS 리로드로는 안 됩니다.**

```bash
cd lightby-app
npx expo prebuild --clean
npx expo run:ios          # 또는 EAS: eas build --profile development --platform ios
```

- `app.json`에 `react-native-iap` 플러그인 + `newArchEnabled: true` 이미 설정됨.
- 결제 초기화는 부팅이 아니라 **결제 버튼 누를 때 지연 초기화**되므로, IAP 모듈만 빌드돼 있으면 됩니다.

---

## 7. 실기기 샌드박스 테스트 (가장 중요)

1. 위 네이티브 빌드를 **실기기**(시뮬레이터 X)에 설치.
2. 공고 등록 → 프리미엄/지역탑 선택 → "등록하기" → Apple 결제 시트 → 샌드박스 계정으로 결제.
3. 확인할 것:
   - 결제 성공 후 "공고가 등록되었습니다" 표시
   - 백엔드 `site_payment`에 `payment_method='apple'`, `pg_transaction_id`(애플 거래ID), `product`(PREMIUM/TOP) 행 생성
   - 같은 거래 재시도 시 **중복 등록 안 됨**(멱등성)
4. 실패 시 백엔드 로그의 `[IapService] 애플 거래 검증 실패` 메시지 확인.

---

## 알려진 미구현 (추후)
- **미완료 거래 자동 복구(reconcile)**: 서버 실패로 finish 안 된 결제의 자동 재처리 없음(멱등성 덕에 중복은 안 생김).
- **Android(Google Play Billing)**: 미지원 — iOS 전용.
- **환불/서버 알림(App Store Server Notifications)**: 미연동.
