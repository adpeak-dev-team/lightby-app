import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

import { getOrCreateDeviceId } from '@/api/apiClient';
import { registerDevice } from './api';

// 포그라운드에서도 푸시 배너/사운드가 뜨도록 핸들러 설정
// (앱이 켜져 있을 때 푸시가 오면 기본적으로는 안 뜸 → 명시적으로 켜준다)
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

// Android: 채널이 없으면 푸시가 무음으로 도착할 수 있어 default 채널을 보장
async function ensureAndroidChannel() {
    if (Platform.OS !== 'android') return;
    await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3b82f6',
    });
}

/**
 * 푸시 권한 요청 + 토큰 발급 + 서버 등록까지 한 번에 처리.
 * - 실기기에서만 동작 (시뮬레이터/에뮬레이터는 토큰 발급 불가)
 * - 권한 거부 시 토큰 없이 device_id만 서버에 등록 (이후 토글로 다시 받을 수 있게)
 * - 앱 부팅 시 호출하면 안전 (실패해도 throw 안 함)
 */
export async function registerForPushNotifications(): Promise<string | null> {
    try {
        await ensureAndroidChannel();

        // 시뮬레이터/웹은 푸시 토큰 발급 불가
        if (!Device.isDevice || Platform.OS === 'web') {
            return null;
        }

        // 1. 현재 권한 상태 확인
        const { status: existing } = await Notifications.getPermissionsAsync();
        let finalStatus = existing;

        // 2. 권한 없으면 요청
        if (existing !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        const deviceId = await getOrCreateDeviceId();
        const platform = Platform.OS === 'ios' ? 'ios' : 'android';
        const appVersion = Constants.expoConfig?.version;

        // 3. 권한 거부 → 토큰 없이 등록만
        if (finalStatus !== 'granted') {
            await registerDevice({
                device_id: deviceId,
                push_token: null,
                platform,
                app_version: appVersion,
            });
            return null;
        }

        // 4. Expo push token 발급 (app.json의 eas.projectId 사용)
        const projectId =
            Constants.expoConfig?.extra?.eas?.projectId ??
            (Constants as any).easConfig?.projectId;

        const tokenRes = await Notifications.getExpoPushTokenAsync(
            projectId ? { projectId } : undefined,
        );
        const pushToken = tokenRes.data;

        await registerDevice({
            device_id: deviceId,
            push_token: pushToken,
            platform,
            app_version: appVersion,
        });

        return pushToken;
    } catch (e) {
        // 푸시 실패가 앱 부팅을 막으면 안 됨
        console.warn('[push] register failed:', e);
        return null;
    }
}
