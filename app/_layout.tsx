import { useEffect } from 'react';
import { Platform, Text, TextInput } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import Toast from '@/components/common/Toast';
import { registerForPushNotifications } from '@/services/push/register';
import { useNotificationObserver } from '@/services/push/useNotificationObserver';
const queryClient = new QueryClient();

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

  const [fontsLoaded] = useFonts({
    Pretendard: require('../assets/fonts/PretendardVariable.ttf'),
  });

  // 부팅 시 한 번 푸시 권한 요청 & 토큰 서버 등록 (실패해도 throw 안 함)
  useEffect(() => {
    registerForPushNotifications();
  }, []);

  // 푸시 알림 탭 → 해당 공고로 이동
  useNotificationObserver();

  // 폰트 로드 완료 시 전역 기본 폰트 주입 후 렌더(시스템 폰트 깜빡임 방지)
  if (!fontsLoaded) return null;
  applyPretendardDefault();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
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
                <Stack.Screen name="mypage/talent" options={{ headerShown: false }} />
                <Stack.Screen name="mypage/application-status" options={{ headerShown: false }} />
                <Stack.Screen name="mypage/applicant-management" options={{ headerShown: false }} />
                <Stack.Screen name="mypage/post" options={{ headerShown: false }} />
                <Stack.Screen name="mypage/support" options={{ headerShown: false }} />
                <Stack.Screen name="mypage/notifications" options={{ headerShown: false }} />
                <Stack.Screen name="mypage/withdraw" options={{ headerShown: false }} />
                <Stack.Screen name="mypage/blocked" options={{ headerShown: false }} />
                <Stack.Screen name="registration/sitepost" options={{ headerShown: false }} />
                <Stack.Screen name="registration/sitepost-edit/[id]" options={{ headerShown: false }} />
                <Stack.Screen name="registration/qna" options={{ headerShown: false }} />
                <Stack.Screen name="registration/communitypost" options={{ headerShown: false }} />
                <Stack.Screen name="registration/communitypost-edit/[id]" options={{ headerShown: false }} />
                <Stack.Screen name="map-view" options={{ headerShown: false }} />
                <Stack.Screen name="terms" options={{ headerShown: false }} />
                <Stack.Screen name="fortune" options={{ headerShown: false }} />
            <Stack.Screen name="posts/applicants/[id]" options={{ headerShown: false }} />
              </Stack>
              <StatusBar style="auto" />
              <Toast />
            </SafeAreaView>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
