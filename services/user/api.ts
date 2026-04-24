import { apiClient } from '@/api/apiClient';
import { FavoriteSiteItem, UserProfile, UserPostCount, UserJobPostItem, UserBoardPostItem } from './types';

export async function getFavoriteSites(
  tab: 'regions' | 'likes',
  start = 0,
  limit = 20,
): Promise<FavoriteSiteItem[]> {
  const { data } = await apiClient.get<{ success: boolean; data: FavoriteSiteItem[] }>(
    `/user/favorite-sites?tab=${tab}&start=${start}&limit=${limit}`,
  );
  return data.data;
}

export async function getUserProfile(): Promise<UserProfile> {
  const { data } = await apiClient.get<{ success: boolean; data: UserProfile }>('/user/profile');
  return data.data;
}

export async function getUserPostCount(): Promise<UserPostCount> {
  const { data } = await apiClient.get<{ success: boolean; data: UserPostCount }>('/user/post-count');
  return data.data;
}

export async function updateNickname(nickname: string): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.patch('/user/nickname', { nickname });
  return data;
}

export async function sendPhoneAuthCode(phone: string): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.post('/user/phone/send-auth-code', { phone });
  return data;
}

export async function verifyPhoneAuthCode(phone: string, authCode: string): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.post('/user/phone/verify-auth-code', { phone, authCode });
  return data;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.patch('/user/password', { currentPassword, newPassword });
  return data;
}

export async function saveTalentInfo(info: {
  gender: string;
  birthday: string;
  introduction: string;
  careers: string[];
}): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.post('/user/talent-info', {
    gender: info.gender === '남자' ? 'male' : 'female',
    birthday: info.birthday,
    introduction: info.introduction,
    careers: info.careers,
  });
  return data;
}

export async function getUserJobPostList(start = 0, limit = 20): Promise<UserJobPostItem[]> {
  const { data } = await apiClient.get<{ success: boolean; data: UserJobPostItem[] }>(
    `/user/post-list?tab=jobs&start=${start}&limit=${limit}`,
  );
  return data.data;
}

export async function getUserBoardPostList(start = 0, limit = 20): Promise<UserBoardPostItem[]> {
  const { data } = await apiClient.get<{ success: boolean; data: UserBoardPostItem[] }>(
    `/user/post-list?tab=boards&start=${start}&limit=${limit}`,
  );
  return data.data;
}

export interface PreferencesData {
  industries: string[];
  jobCategories: string[];
  userWorkRegions: string[];
}

export async function getPreferences(): Promise<PreferencesData> {
  const { data } = await apiClient.get<{ success: boolean; data: PreferencesData }>('/user/preferences');
  return data.data;
}

export async function savePreferences(body: {
  industryCodes: string[];
  roleCodes: string[];
  regionCodes: string[];
}): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.post('/user/preferences', body);
  return data;
}
