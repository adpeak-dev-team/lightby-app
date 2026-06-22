import { apiClient } from '@/api/apiClient';

export type RegisterDeviceBody = {
    device_id: string;
    push_token: string | null;
    platform: 'android' | 'ios';
    app_version?: string;
    locale?: string;
    timezone?: string;
};

export async function registerDevice(body: RegisterDeviceBody): Promise<void> {
    await apiClient.post('/user/devices', body);
}
