import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  updateName, updateNickname, sendPhoneAuthCode, verifyPhoneAuthCode, changePassword, saveTalentInfo, savePreferences, uploadProfileImage, deleteProfileImage, withdrawUser,
  updateNotificationSettings, type NotificationSettings,
} from './api';
import { USER_KEYS, PREFERENCES_KEYS, FAVORITE_KEYS, NOTIFICATION_SETTINGS_KEY } from './queries';

/**
 * 사주는 프로필의 **이름·생년월일·성별**로 뽑는다. 프로필을 고치면 사주 캐시도 비워야
 * 운세 화면의 "내 정보 변경" 에서 돌아왔을 때 바로 반영된다(예전엔 앱을 껐다 켜야 했다).
 * 결과 3종도 같이 — 생년월일이 바뀌면 이전 결과는 남의 사주다. 오늘 운세는 staleTime 이
 * Infinity 라 invalidate 없이는 영영 안 바뀐다. (웹 useSaveUserProfile 과 같은 목록)
 */
function invalidateSaju(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['saju-profile'] });
  qc.invalidateQueries({ queryKey: ['saju-daily'] });
  qc.invalidateQueries({ queryKey: ['saju-monthly'] });
  qc.invalidateQueries({ queryKey: ['saju-natal'] });
}

// 회원 탈퇴 (성공 시 호출부에서 토큰/캐시 정리 및 화면 이동)
export function useWithdrawUser() {
  return useMutation({
    mutationFn: () => withdrawUser(),
  });
}

export function useUpdateName() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => updateName(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USER_KEYS.profile });
      invalidateSaju(qc);
    },
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: USER_KEYS.profile });
      invalidateSaju(qc);
    },
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
