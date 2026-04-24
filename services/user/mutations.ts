import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  updateNickname, sendPhoneAuthCode, verifyPhoneAuthCode, changePassword, saveTalentInfo, savePreferences,
} from './api';
import { USER_KEYS, PREFERENCES_KEYS, FAVORITE_KEYS } from './queries';

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
