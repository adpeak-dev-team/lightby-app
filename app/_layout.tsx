import { useEffect } from 'react';
import { Platform } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import Toast from '@/components/common/Toast';

const queryClient = new QueryClient();

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
                <Stack.Screen name="mypage/withdraw" options={{ headerShown: false }} />
                <Stack.Screen name="registration/sitepost" options={{ headerShown: false }} />
                <Stack.Screen name="registration/sitepost-edit/[id]" options={{ headerShown: false }} />
                <Stack.Screen name="registration/qna" options={{ headerShown: false }} />
                <Stack.Screen name="registration/communitypost" options={{ headerShown: false }} />
                <Stack.Screen name="registration/communitypost-edit/[id]" options={{ headerShown: false }} />
                <Stack.Screen name="map-view" options={{ headerShown: false }} />
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
