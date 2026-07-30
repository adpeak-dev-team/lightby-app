import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { getJobsByProduct, getJobDetail, getLikeStatus, getMyApplications, getMyJobPostings, getPostApplicants, getMyRecentPosts, getBanners, getMainStats, getSitePricing, BannerItem, SitePricing } from './api';
import { JobSummaryResponse, JobPostDetail, ApplicationItem, ApplicantItem, ApplicantProfile, MyPostSummary, MainStats } from './types';
import { useGetMe } from '@/services/auth/queries';

// 관리자 결제관리(DB)에서 가격을 바꾸면 앱 재진입 시 바로 반영되게 항상 최신 조회.
export const SITE_PRICING_QUERY_KEY = ['site-pricing'] as const;
export function useSitePricing() {
  return useQuery<SitePricing>({
    queryKey: SITE_PRICING_QUERY_KEY,
    queryFn: getSitePricing,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useGetJobDetail(id: string) {
  return useQuery<JobPostDetail>({
    queryKey: ['job-detail', id],
    queryFn: () => getJobDetail(id),
    enabled: !!id,
  });
}

export function useGetLikeStatus(siteId?: number) {
  return useQuery<{ liked: boolean }>({
    queryKey: ['site-like', siteId],
    queryFn: () => getLikeStatus(siteId!),
    enabled: !!siteId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useGetJobsByProduct(params: { product: 'PREMIUM' | 'TOP'; location?: string; search?: string }) {
  const { data: me } = useGetMe();
  return useQuery<JobSummaryResponse[]>({
    // viewerId를 키에 포함 → 로그인/차단 상태 변화 시 재조회 (App Store 1.2 차단자 공고 숨김)
    queryKey: ['jobs', params.product, params.location, params.search, me?.id],
    queryFn: () => getJobsByProduct({ ...params, viewerId: me?.id }),
  });
}

export function useGetMyApplications() {
  return useQuery<{ items: ApplicationItem[] }>({
    queryKey: ['my-applications'],
    queryFn: getMyApplications,
  });
}

// ⚠️ 인증 필요 쿼리다. 비로그인 상태에서 호출하면 401 → apiClient 인터셉터가
//    로그인 화면으로 보내버리므로, 호출부에서 반드시 enabled 로 막아야 한다.
export function useGetMyJobPostings(options?: { enabled?: boolean }) {
  return useQuery<{ items: ApplicantItem[] }>({
    queryKey: ['my-job-postings'],
    queryFn: getMyJobPostings,
    ...options,
  });
}

export function useGetPostApplicants(postingId: string) {
  return useQuery<{ items: ApplicantProfile[] }>({
    queryKey: ['post-applicants', postingId],
    queryFn: () => getPostApplicants(postingId),
    enabled: !!postingId,
  });
}

export function useGetMyRecentPosts() {
  const { data: me } = useGetMe();
  return useQuery<MyPostSummary[]>({
    queryKey: ['my-recent-posts', me?.id],
    queryFn: () => getMyRecentPosts(10),
    enabled: !!me?.id,
    staleTime: 1000 * 60,
  });
}

export function useGetBanners() {
  return useQuery<BannerItem[]>({
    queryKey: ['banners'],
    queryFn: getBanners,
    staleTime: 1000 * 60 * 5,
  });
}

export function useGetMainStats() {
  return useQuery<MainStats>({
    queryKey: ['mainStats'],
    queryFn: getMainStats,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60, // 실시간 방문자: 1분마다 갱신
  });
}

export function useGetFreeJobsInfinite(params: { search?: string; sort?: string; location?: string }) {
  const { data: me } = useGetMe();
  return useInfiniteQuery<JobSummaryResponse[]>({
    // viewerId를 키에 포함 → 로그인/차단 상태 변화 시 재조회 (App Store 1.2 차단자 공고 숨김)
    queryKey: ['jobs-free', params.search, params.sort, params.location, me?.id],
    queryFn: ({ pageParam }) =>
      getJobsByProduct({ product: 'FREE', start: pageParam as number, limit: 20, viewerId: me?.id, ...params }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length === 20 ? (lastPageParam as number) + 20 : undefined,
  });
}
