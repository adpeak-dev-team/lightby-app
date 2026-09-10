import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import {
    POINT_HISTORY_PAGE_SIZE,
    getPointBalance, getPointHistory, getPointPackages, getPointPolicies,
} from './api';

export const POINT_QUERY_KEYS = {
    balance: ['point-balance'] as const,
    history: ['point-history'] as const,
    policies: ['point-policies'] as const,
    packages: ['point-packages'] as const,
};

/**
 * 잔액.
 *
 * 적립·사용이 화면 곳곳에서 일어나므로 오래 들고 있지 않는다.
 * 값이 바뀌는 자리(글 등록·공고 등록·충전)에서 호출부가 invalidate 한다.
 */
export const usePointBalance = (enabled = true) =>
    useQuery({
        queryKey: POINT_QUERY_KEYS.balance,
        queryFn: getPointBalance,
        enabled,
        staleTime: 1000 * 10,
        retry: false,
    });

/**
 * 사용 내역.
 *
 * nextCursor 는 마지막 행이 있으면 항상 채워져 온다 — 그것만 보고 판단하면
 * 두 건뿐인데도 '더 보기'가 뜬다. 받아 온 개수로 끝을 판단한다.
 */
export const usePointHistory = () =>
    useInfiniteQuery({
        queryKey: POINT_QUERY_KEYS.history,
        queryFn: ({ pageParam }) => getPointHistory(pageParam as number | undefined),
        initialPageParam: undefined as number | undefined,
        getNextPageParam: (last) =>
            last.items.length < POINT_HISTORY_PAGE_SIZE ? undefined : (last.nextCursor ?? undefined),
        retry: false,
    });

/** 적립 규칙. 어드민이 금액을 바꾸면 안내 문구도 따라 바뀌어야 해서 화면이 이걸 읽는다. */
export const usePointPolicies = () =>
    useQuery({
        queryKey: POINT_QUERY_KEYS.policies,
        queryFn: getPointPolicies,
        staleTime: 1000 * 60 * 5,
        retry: false,
    });

/** 충전 상품. 웹 충전이 꺼져 있으면 enabled=false 로 온다. */
export const usePointPackages = (enabled = true) =>
    useQuery({
        queryKey: POINT_QUERY_KEYS.packages,
        queryFn: getPointPackages,
        enabled,
        staleTime: 1000 * 60,
        retry: false,
    });
