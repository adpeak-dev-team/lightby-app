import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { getJobsByProduct, getJobDetail, getLikeStatus, getMyApplications, getMyJobPostings, getPostApplicants, getMyRecentPosts, getBanners, BannerItem } from './api';
import { JobSummaryResponse, JobPostDetail, ApplicationItem, ApplicantItem, ApplicantProfile, MyPostSummary } from './types';
import { useGetMe } from '@/services/auth/queries';

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
  return useQuery<JobSummaryResponse[]>({
    queryKey: ['jobs', params.product, params.location, params.search],
    queryFn: () => getJobsByProduct(params),
  });
}

export function useGetMyApplications() {
  return useQuery<{ items: ApplicationItem[] }>({
    queryKey: ['my-applications'],
    queryFn: getMyApplications,
  });
}

export function useGetMyJobPostings() {
  return useQuery<{ items: ApplicantItem[] }>({
    queryKey: ['my-job-postings'],
    queryFn: getMyJobPostings,
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

export function useGetFreeJobsInfinite(params: { search?: string; sort?: string; location?: string }) {
  return useInfiniteQuery<JobSummaryResponse[]>({
    queryKey: ['jobs-free', params.search, params.sort, params.location],
    queryFn: ({ pageParam }) =>
      getJobsByProduct({ product: 'FREE', start: pageParam as number, limit: 20, ...params }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length === 20 ? (lastPageParam as number) + 20 : undefined,
  });
}
