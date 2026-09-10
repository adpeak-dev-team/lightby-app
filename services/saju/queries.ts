import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
    deleteSavedMatchTarget, getSajuAccess, getSajuDaily, getSajuMonthly, getSajuNatal, getSajuProfile,
    getSajuRegions, getSavedMatchTargets, postMatchAccess, postSajuMatch, saveSajuProfile,
} from './api';
import type { MatchInput, SajuProfileInput } from './types';

export const SAJU_QUERY_KEYS = {
    regions: ['saju-regions'] as const,
    profile: ['saju-profile'] as const,
    daily: (offset: number) => ['saju-daily', offset] as const,
    monthly: () => ['saju-monthly'] as const,
    natal: ['saju-natal'] as const,
    access: ['saju-access'] as const,
    savedTargets: ['saju-match-saved'] as const,
};

/** 지역 목록은 사실상 상수라 오래 캐시한다 */
export const useSajuRegions = () =>
    useQuery({
        queryKey: SAJU_QUERY_KEYS.regions,
        queryFn: getSajuRegions,
        staleTime: 1000 * 60 * 60 * 24,
    });

export const useSajuProfile = () =>
    useQuery({
        queryKey: SAJU_QUERY_KEYS.profile,
        queryFn: getSajuProfile,
        // 출생 정보는 자주 안 바뀌지만, 저장 직후 반영은 invalidate 로 처리한다
        staleTime: 1000 * 60 * 5,
        retry: false,
    });

/**
 * 오늘의 운세.
 *
 * 오늘(offset 0)은 서버가 그날 결과를 동결해 두므로 다시 받아올 이유가 없다 —
 * `staleTime: Infinity` 로 두어 화면을 오갈 때마다 재요청하지 않는다.
 * (요청이 가도 서버가 같은 값을 돌려주지만, 굳이 왕복할 필요가 없다.)
 */
export const useSajuDaily = (offset: number, enabled = true) =>
    useQuery({
        queryKey: SAJU_QUERY_KEYS.daily(offset),
        queryFn: () => getSajuDaily(offset),
        enabled,
        staleTime: Infinity,
        retry: false,
    });

/** 이번 달 운세. 한 달 내내 같은 값이라 오래 캐시한다. */
export const useSajuMonthly = (enabled = true) =>
    useQuery({
        queryKey: SAJU_QUERY_KEYS.monthly(),
        queryFn: getSajuMonthly,
        enabled,
        staleTime: 1000 * 60 * 60,
        retry: false,
    });

export const useSajuNatal = (enabled = true) =>
    useQuery({
        queryKey: SAJU_QUERY_KEYS.natal,
        queryFn: getSajuNatal,
        enabled,
        staleTime: 1000 * 60 * 30,
        retry: false,
    });

/**
 * 영업 궁합 조회.
 *
 * 조회지만 mutation 으로 둔다 — 상대방 정보를 매번 새로 받아 계산하는 것이라
 * 캐시 키를 만들 대상이 아니고, 남의 생년월일을 쿼리 키에 남길 이유도 없다.
 */
export const useSajuMatch = () =>
    useMutation({
        mutationFn: (input: MatchInput) => postSajuMatch(input),
        retry: false,
    });

/**
 * 출생 정보 저장.
 * 역법·시각이 바뀌면 원국이 통째로 달라지므로 관련 캐시를 전부 비운다.
 * 단, 오늘 운세는 서버에 이미 동결돼 있어 값이 바뀌지 않는다(재요청해도 같은 결과).
 */
export const useSaveSajuProfile = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (input: SajuProfileInput) => saveSajuProfile(input),
        onSuccess: (profile) => {
            queryClient.setQueryData(SAJU_QUERY_KEYS.profile, profile);
            queryClient.invalidateQueries({ queryKey: SAJU_QUERY_KEYS.natal });
            queryClient.invalidateQueries({ queryKey: ['saju-daily'] });
            queryClient.invalidateQueries({ queryKey: ['saju-monthly'] });
        },
    });
};

/**
 * 유료 항목 이용 상태.
 *
 * 차감 뒤에는 owned 가 바뀌므로 캐시를 오래 두지 않는다.
 * 조회에 성공하면 호출부가 invalidate 한다.
 */
export const useSajuAccess = () =>
    useQuery({
        queryKey: SAJU_QUERY_KEYS.access,
        queryFn: getSajuAccess,
        staleTime: 1000 * 10,
        retry: false,
    });

/**
 * 내가 궁합을 본 상대 목록.
 *
 * 궁합을 한 번 더 보면 viewedAt 이 바뀌므로, 결과를 받은 뒤 호출부가 invalidate 한다.
 */
export const useSavedMatchTargets = () =>
    useQuery({
        queryKey: SAJU_QUERY_KEYS.savedTargets,
        queryFn: getSavedMatchTargets,
        staleTime: 1000 * 30,
        retry: false,
    });

export const useDeleteSavedMatchTarget = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => deleteSavedMatchTarget(id),
        onSuccess: () => void queryClient.invalidateQueries({ queryKey: SAJU_QUERY_KEYS.savedTargets }),
    });
};

/** 이 상대가 얼마인지 묻는다. 차감은 없다 — 확인을 받고 나서 /saju/match 를 부른다. */
export const useMatchAccess = () =>
    useMutation({
        mutationFn: (input: MatchInput) => postMatchAccess(input),
        retry: false,
    });
