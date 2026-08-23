# lightby-app

번개분양 모바일 앱 (`번개분양`, v1.0.6). Expo SDK 54 + expo-router + React Native.
번들 ID / 패키지: `com.lightby.app`, 스킴: `lightbyapp`.

## 실행

```bash
npm install          # postinstall 로 patch-package 가 자동 실행된다
npx expo start       # Metro 번들러 (8081)
npm run android      # expo run:android
npm run ios          # expo run:ios
```

## ⚠️ Expo Go 로는 실행되지 않는다

`@react-native-seoul/kakao-login`, `expo-notifications` 등 **네이티브 모듈**을 쓰기 때문에
Expo Go 앱으로는 뜨지 않는다. **개발 빌드(dev client)** 를 설치한 실기기나 에뮬레이터가 필요하다.

```bash
eas build --profile development-device --platform android   # 실기기용
eas build --profile development --platform ios              # 시뮬레이터용
```

`npx expo start --web` 는 화면은 뜨지만 카카오 로그인 등 네이티브 기능이 동작하지 않는다.

## patch-package

`patches/@react-native-seoul+kakao-login+5.4.2.patch` 가 적용된 상태다.
`npm install` 시 `postinstall` 로 자동 적용되므로, **패치가 깨졌다는 에러가 나면
해당 패키지 버전을 올린 게 원인**이다. 버전을 올렸다면 패치를 다시 만들어야 한다.

## EAS 빌드 프로필 (`eas.json`)

| 프로필 | 용도 |
|---|---|
| `development` | iOS 시뮬레이터용 dev client |
| `development-device` | 실기기용 dev client |
| `preview` | 내부 배포 |
| `production` | 스토어 제출 (`autoIncrement`) |

`appVersionSource: "remote"` — 버전 번호는 EAS 서버가 관리한다. 로컬에서 올리지 말 것.

## 구조

```
app/                  expo-router (파일 = 라우트)
├── (tabs)/           하단 탭
├── auth/             로그인
├── posts/ open/ registration/ mypage/
├── fortune.tsx map-view.tsx terms.tsx
└── _layout.tsx
api/ services/        백엔드 호출
components/ hooks/ lib/ constants/
plugins/              expo config plugin
patches/              patch-package
```

딥링크는 `app.json` 에 등록돼 있다 — `lightby.co.kr/posts`, `/open`.

## 알아둘 것

- 백엔드 CORS 허용 목록에 `http://localhost:8081` (Expo web) 이 들어 있다.
- 카카오 로그인 이슈는 `KAKAOERROR.md` 참고.
- `.env` 는 `.gitignore` 처리되어 커밋되지 않는다 (정상).

## ⚠️ 이 저장소는 현재 공개(public) 상태다

회사 서비스 소스인데 누구나 볼 수 있다. 의도한 설정이 아니라면 **비공개로 전환할 것**
(Settings → General → Danger Zone → Change visibility).

관련해서 커밋된 것:
- `eas.json` 의 `EXPO_PUBLIC_KAKAO_REST_API_KEY` — REST 키는 원래 서버용이다. 공개 저장소에 두지 말 것.
- `google-services.json` — Google 은 앱에 포함되는 파일로 보지만, 공개 저장소에서는 Firebase 프로젝트 구성이 그대로 노출된다.

`production` 프로필의 `EXPO_PUBLIC_KAKAO_REDIRECT_URI` 가 `http://localhost:3000/auth/kakao` 로 되어 있다.
운영 빌드에서 localhost 를 가리키는 것이라 의도한 값인지 확인이 필요하다.

## 브랜치 / CI

- `main` — 직접 push 금지, PR 로만.
- **GitHub Actions 워크플로우가 아직 없다.** (back/front 는 GHCR 빌드가 있다)
  앱은 도커가 아니라 EAS 빌드라, 필요하면 `eas build` 를 도는 워크플로우를 따로 만든다.
