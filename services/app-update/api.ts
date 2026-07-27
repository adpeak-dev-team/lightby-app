import { apiClient } from '@/api/apiClient';

export interface AppVersionConfig {
    // 강제 업데이트 기준(이 버전 미만이면 강제). 백엔드 env로 관리.
    minSupported: { ios: string; android: string };
    // 스토어 이동 URL (iOS=App Store, Android=Play)
    storeUrl: { ios: string; android: string };
}

/** 강제 업데이트 기준 버전 조회 (@Public 라우트). */
export async function fetchAppVersionConfig(): Promise<AppVersionConfig> {
    const { data } = await apiClient.get<AppVersionConfig>('/app-version');
    return data;
}
