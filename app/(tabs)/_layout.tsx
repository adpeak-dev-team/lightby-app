import { Tabs } from 'expo-router';
import React, { useMemo } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';

const ACTIVE_COLOR = '#3b82f6'; // text-primary
const INACTIVE_COLOR = '#94a3b8'; // text-slate-400 (웹과 동일)

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  // insets.bottom 이 0 으로 오는 기기(제스처 힌트 숨김, edge-to-edge 미적용 등)에서는
  // 라벨이 시스템 내비바에 그대로 맞닿아 보인다. 최소 여백을 보장한다.
  const bottomInset = Math.max(insets.bottom, 8);

  // 키보드가 뜰 때 inset 변화로 screenOptions 객체가 매 렌더 새로 생성되면
  // 탭바가 재계산되며 포커스된 TextInput의 포커스를 뺏는다. 하단 inset에만 의존시킨다.
  const screenOptions = useMemo(
    () => ({
      headerShown: false,
      tabBarButton: HapticTab,
      tabBarActiveTintColor: ACTIVE_COLOR,
      tabBarInactiveTintColor: INACTIVE_COLOR,
      // 키보드가 올라오면 탭바를 숨겨 레이아웃 다툼을 없앤다.
      tabBarHideOnKeyboard: true,
      tabBarStyle: {
        backgroundColor: '#fff',
        borderTopColor: '#f1f5f9',
        borderTopWidth: 1,
        height: 52 + bottomInset,
        paddingBottom: bottomInset,
        paddingTop: 6,
      },
      tabBarLabelStyle: {
        fontSize: 10,
        fontWeight: '500' as const,
      },
    }),
    [bottomInset],
  );

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ color }) => <MaterialIcons name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: '현장소통',
          tabBarIcon: ({ color }) => <MaterialIcons name="forum" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="favorite"
        options={{
          title: '관심현장',
          tabBarIcon: ({ color }) => <MaterialIcons name="search" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="my"
        options={{
          title: '마이페이지',
          tabBarIcon: ({ color }) => <MaterialIcons name="account-circle" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
