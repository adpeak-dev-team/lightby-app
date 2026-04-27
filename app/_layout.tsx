import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useColorScheme } from '@/hooks/use-color-scheme';
import Toast from '@/components/common/Toast';

const queryClient = new QueryClient();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth/login" options={{ headerShown: false }} />
          <Stack.Screen name="auth/register" options={{ headerShown: false }} />
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
          <Stack.Screen name="registration/sitepost" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
        <Toast />
      </ThemeProvider>
    </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
