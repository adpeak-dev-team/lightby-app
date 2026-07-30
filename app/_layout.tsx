import { useEffect, useState } from 'react';
import { AppState, AppStateStatus, Platform, Text, TextInput } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClientProvider, focusManager } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics } from 'react-native-safe-area-context';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';

// 최초 설치 후 첫 실행에서 스플래시가 안 내려가는 문제 대응.
// MainActivity 의 SplashScreenManager.registerOnActivity 는 "루트 뷰가 실제로 그려질 때" auto-hide 하는데
// 폰트 로딩 중 root 가 null 을 리턴하는 순간 트리거를 놓쳐 무한 대기가 됨.
// 모듈 로드 즉시 auto-hide 를 차단하고, 폰트 로드 완료(or 실패) 시 명시적으로 hide 한다.
SplashScreen.preventAutoHideAsync().catch(() => { });

import { useColorScheme } from '@/hooks/use-color-scheme';
import Toast from '@/components/common/Toast';
import { ForceUpdateGate } from '@/components/ForceUpdateGate';
import { registerForPushNotifications } from '@/services/push/register';
import { useNotificationObserver } from '@/services/push/useNotificationObserver';
import { queryClient } from '@/lib/queryClient';

/**
 * RN에는 브라우저의 window focus 이벤트가 없어 react-query의 refetchOnWindowFocus가
 * 아무 때도 발동하지 않는다. AppState를 focusManager에 물려서
 * "백그라운드 → 포그라운드 복귀" 시 stale 쿼리(알림 배지, 공고 목록 등)가 갱신되게 한다.
 */
function useAppStateFocus() {
  useEffect(() => {
    const onChange = (status: AppStateStatus) => {
      if (Platform.OS === 'web') return;
      focusManager.setFocused(status === 'active');
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);
}

// 웹(Pretendard)과 동일한 폰트를 앱 전역 기본값으로 적용.
// RN은 폰트가 상속되지 않으므로 Text/TextInput defaultProps에 한 번만 주입한다.
// 가변 폰트라 각 컴포넌트의 fontWeight 값이 그대로 살아난다(별도 매핑 불필요).
let fontDefaultsApplied = false;
function applyPretendardDefault() {
  if (fontDefaultsApplied) return;
  fontDefaultsApplied = true;
  const T = Text as unknown as { defaultProps?: { style?: unknown } };
  const TI = TextInput as unknown as { defaultProps?: { style?: unknown } };
  T.defaultProps = T.defaultProps ?? {};
  T.defaultProps.style = [{ fontFamily: 'Pretendard' }, T.defaultProps.style];
  TI.defaultProps = TI.defaultProps ?? {};
  TI.defaultProps.style = [{ fontFamily: 'Pretendard' }, TI.defaultProps.style];
}

export const unstable_settings = {
  anchor: '(tabs)',
};

/**
 * 웹(react-native-web)에서 한글이 글자 단위로 끊기지 않고 단어 단위로 줄바꿈되도록
 * 전역 CSS를 주입한다. (긴 URL 등 끊을 곳 없는 문자열은 overflow-wrap으로 넘침 방지)
 */
function useWebWordBreak() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const STYLE_ID = 'global-word-break';
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `* { word-break: keep-all; overflow-wrap: anywhere; }`;
    document.head.appendChild(style);
  }, []);
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  useWebWordBreak();
  useAppStateFocus();

  const [fontsLoaded, fontsError] = useFonts({
    Pretendard: require('../assets/fonts/PretendardVariable.ttf'),
  });

  // 폰트 결과가 아예 안 오는 최악의 경우(디바이스별 useFonts 버그 등)에도
  // 첫 실행이 스플래시에서 무한 대기하지 않도록 강제 진행 플래그.
  const [forceReady, setForceReady] = useState(false);

  // 폰트가 준비되거나 실패하면 스플래시 명시적으로 내림.
  // 실패 시에도 진행해야 시스템 폰트로라도 앱이 뜬다(멈춤 방지).
  // 5초 안에 어떤 결과도 안 오면 강제로 진행 — 이 이상 대기하면 사용자가 앱을 종료해버림.
  useEffect(() => {
    if (fontsLoaded || fontsError) {
      SplashScreen.hideAsync().catch(() => { });
      return;
    }
    const t = setTimeout(() => {
      setForceReady(true);
      SplashScreen.hideAsync().catch(() => { });
    }, 5000);
    return () => clearTimeout(t);
  }, [fontsLoaded, fontsError]);

  /**
   * 안드로이드 키보드 회피(전역).
   *
   * edge-to-edge 에서는 windowSoftInputMode=adjustResize 여도 창이 실제로 줄지 않고
   * IME 가 인셋으로만 들어온다. 그래서 ScrollView 는 자기가 키보드에 가려진 걸 모르고
   * 포커스된 입력창으로 스크롤하지 않는다(공고 등록 폼 하단 입력창이 가려지던 원인).
   * 루트에서 키보드 높이만큼 비워주면 모든 화면이 한 번에 해결된다.
   *
   * ⚠️ 안드로이드의 keyboardDidShow 는 내비게이션 바 인셋을 뺀 높이를 준다.
   *    실제 키보드는 내비바 영역까지 덮으므로 그만큼 더해야 정확히 맞는다.
   *    (insets 훅은 SafeAreaProvider 바깥이라 못 쓰고, 내비바 높이는 런타임에
   *     바뀌지 않으므로 initialWindowMetrics 로 충분하다)
   * iOS 는 각 화면이 이미 개별 처리하고 있어 건드리지 않는다.
   */
  const kbHeight = useKeyboardHeight();
  const androidKeyboardPad =
    Platform.OS === 'android' && kbHeight > 0
      ? kbHeight + (initialWindowMetrics?.insets.bottom ?? 0)
      : 0;

  // 부팅 시 한 번 푸시 권한 요청 & 토큰 서버 등록 (실패해도 throw 안 함)
  useEffect(() => {
    registerForPushNotifications();
  }, []);

  // OTA 업데이트 수동 체크 — 앱 시작 5초 후 백그라운드로.
  // app.json 의 checkAutomatically:"ON_ERROR_RECOVERY" 설정과 짝을 이룬다.
  // (기본 자동 체크는 첫 실행 시 OTA 서버 연결 지연으로 스플래시가 최대 10초 멈추는 문제가 있어 껐다.
  //  대신 여기서 지연 실행으로 백그라운드 업데이트를 유지한다.)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const t = setTimeout(async () => {
      try {
        const res = await Updates.checkForUpdateAsync();
        if (res.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch { /* 네트워크 실패 등은 조용히 무시 — 다음 실행에서 다시 시도됨 */ }
    }, 5000);
    return () => clearTimeout(t);
  }, []);

  // 푸시 알림 탭 → 해당 공고로 이동
  useNotificationObserver();

  // 폰트 로드 완료 시 전역 기본 폰트 주입 후 렌더(시스템 폰트 깜빡임 방지).
  // 실패/타임아웃 시엔 시스템 폰트로 진행(스플래시 무한 대기 방지).
  if (!fontsLoaded && !fontsError && !forceReady) return null;
  if (fontsLoaded) applyPretendardDefault();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <SafeAreaView style={{ flex: 1, paddingBottom: androidKeyboardPad }} edges={['top']}>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="auth/login" options={{ headerShown: false }} />
                <Stack.Screen name="auth/register" options={{ headerShown: false }} />
                <Stack.Screen name="auth/findpwd" options={{ headerShown: false }} />
                <Stack.Screen name="auth/phoneauth" options={{ headerShown: false }} />
                <Stack.Screen name="auth/kakao" options={{ headerShown: false }} />
                <Stack.Screen name="auth/apple" options={{ headerShown: false }} />
                <Stack.Screen name="posts/board/[id]" options={{ headerShown: false }} />
                <Stack.Screen name="posts/site/[id]" options={{ headerShown: false }} />
                <Stack.Screen name="set-user-info/interest" options={{ headerShown: false }} />
                <Stack.Screen name="set-user-info/profile" options={{ headerShown: false }} />
                <Stack.Screen name="mypage/account" options={{ headerShown: false }} />
                <Stack.Screen name="mypage/settings" options={{ headerShown: false }} />
                <Stack.Screen name="mypage/talent" options={{ headerShown: false }} />
                <Stack.Screen name="mypage/application-status" options={{ headerShown: false }} />
                <Stack.Screen name="mypage/applicant-management" options={{ headerShown: false }} />
                <Stack.Screen name="mypage/post" options={{ headerShown: false }} />
                <Stack.Screen name="mypage/support" options={{ headerShown: false }} />
                <Stack.Screen name="mypage/notifications" options={{ headerShown: false }} />
                <Stack.Screen name="mypage/withdraw" options={{ headerShown: false }} />
                <Stack.Screen name="mypage/blocked" options={{ headerShown: false }} />
                {/* ⚠️ 아래 작성 화면들은 beforeRemove + e.preventDefault() 로 "나가시겠어요?"를 띄운다.
                    iOS 스와이프 백 제스처는 네이티브가 화면을 먼저 없앤 뒤에야 pop 을 dispatch 하므로
                    (native-stack 의 onDismissed) preventDefault 가 무의미해지고, 화면만 마운트된 채 남아
                    확인 모달이 엉뚱한 화면 위로 떠버린다. 제스처를 꺼서 back 을 JS 주도로만 처리한다. */}
                <Stack.Screen name="registration/sitepost" options={{ headerShown: false, gestureEnabled: false }} />
                <Stack.Screen name="registration/sitepost-edit/[id]" options={{ headerShown: false, gestureEnabled: false }} />
                <Stack.Screen name="registration/qna" options={{ headerShown: false, gestureEnabled: false }} />
                <Stack.Screen name="registration/communitypost" options={{ headerShown: false, gestureEnabled: false }} />
                <Stack.Screen name="registration/communitypost-edit/[id]" options={{ headerShown: false, gestureEnabled: false }} />
                <Stack.Screen name="map-view" options={{ headerShown: false }} />
                <Stack.Screen name="terms" options={{ headerShown: false }} />
                <Stack.Screen name="fortune" options={{ headerShown: false }} />
            <Stack.Screen name="posts/applicants/[id]" options={{ headerShown: false }} />
              </Stack>
              <StatusBar style="auto" />
              <Toast />
              {/* 강제 업데이트 게이트 — 구버전이면 차단(Android=Play 임베디드, iOS=모달→App Store) */}
              <ForceUpdateGate />
            </SafeAreaView>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
