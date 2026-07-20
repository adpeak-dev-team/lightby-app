import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  updateNickname, sendPhoneAuthCode, verifyPhoneAuthCode, changePassword, saveTalentInfo, savePreferences, uploadProfileImage, deleteProfileImage, withdrawUser,
  updateNotificationSettings, type NotificationSettings,
} from './api';
import { USER_KEYS, PREFERENCES_KEYS, FAVORITE_KEYS, NOTIFICATION_SETTINGS_KEY } from './queries';

// 회원 탈퇴 (성공 시 호출부에서 토큰/캐시 정리 및 화면 이동)
export function useWithdrawUser() {
  return useMutation({
    mutationFn: () => withdrawUser(),
  });
}

export function useUpdateNickname() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (nickname: string) => updateNickname(nickname),
    onSuccess: () => qc.invalidateQueries({ queryKey: USER_KEYS.profile }),
  });
}

export function useSendPhoneAuthCode() {
  return useMutation({
    mutationFn: (phone: string) => sendPhoneAuthCode(phone),
  });
}

export function useVerifyPhoneAuthCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ phone, authCode }: { phone: string; authCode: string }) =>
      verifyPhoneAuthCode(phone, authCode),
    onSuccess: () => qc.invalidateQueries({ queryKey: USER_KEYS.profile }),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      changePassword(currentPassword, newPassword),
  });
}

export function useSaveTalentInfo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (info: { gender: string; birthday: string; introduction: string; careers: string[] }) =>
      saveTalentInfo(info),
    onSuccess: () => qc.invalidateQueries({ queryKey: USER_KEYS.profile }),
  });
}

export function useUploadProfileImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => uploadProfileImage(formData),
    onSuccess: () => qc.invalidateQueries({ queryKey: USER_KEYS.profile }),
  });
}

// 알림 수신 설정 변경
export function useUpdateNotificationSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<NotificationSettings>) => updateNotificationSettings(patch),
    // 서버가 최신 설정을 돌려주므로 그대로 캐시에 반영한다(재조회 불필요)
    onSuccess: (data) => qc.setQueryData(NOTIFICATION_SETTINGS_KEY, data),
  });
}

// 프로필 이미지 삭제 (기본 프로필로 되돌리기)
export function useDeleteProfileImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => deleteProfileImage(),
    onSuccess: () => qc.invalidateQueries({ queryKey: USER_KEYS.profile }),
  });
}

export function useSavePreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { industryCodes: string[]; roleCodes: string[]; regionCodes: string[] }) =>
      savePreferences(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PREFERENCES_KEYS.preferences });
      qc.invalidateQueries({ queryKey: FAVORITE_KEYS.regions });
      qc.invalidateQueries({ queryKey: FAVORITE_KEYS.likes });
    },
  });
}
