/**
 * 강제 업데이트 게이트 — 웹 전용 스텁.
 *
 * sp-react-native-in-app-updates는 InAppUpdates.android.js / InAppUpdates.ios.js 만 배포하고
 * 웹용 파일이 없어서, 웹 번들에서 `./InAppUpdates`를 해석하지 못해 export가 실패한다.
 * (app.json의 web.output이 "static"이라 expo export --platform all 이 웹까지 번들한다)
 *
 * 원본 ForceUpdateGate도 웹에서는 곧바로 return 하므로 동작상 차이는 없다.
 * metro가 플랫폼 확장자(.web.tsx)를 우선 해석해, 웹 번들에는 라이브러리가 아예 포함되지 않는다.
 */
export function ForceUpdateGate() {
    return null;
}
