import { useMutation, useQueryClient, QueryClient } from '@tanstack/react-query';
import { cancelApplication, deleteJobPost, createJobPost, updateJobPost, updateJobPostImages, JobPostingPayload } from './api';
import { USER_KEYS } from '@/services/user/queries';

/**
 * 공고가 새로 생기거나 사라졌을 때 영향을 받는 목록 캐시를 한 번에 무효화한다.
 *
 * ⚠️ 메인 본문(일반 공고)은 ['jobs-free', ...] 라는 별도 키를 쓴다.
 *    ['jobs'] 만 무효화하면 프리미엄/TOP만 갱신되고 일반 공고는 새로고침 전까지 안 보인다.
 */
export function invalidateJobLists(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ['jobs'] });        // 프리미엄 / 지역 TOP
  qc.invalidateQueries({ queryKey: ['jobs-free'] });   // 메인 일반 공고(무한스크롤)
  qc.invalidateQueries({ queryKey: ['mainStats'] });   // 상단 통계(누적 공고 수)
  qc.invalidateQueries({ queryKey: ['my-recent-posts'] });
  qc.invalidateQueries({ queryKey: ['my-job-postings'] });
  qc.invalidateQueries({ queryKey: ['user-post-list'] });
  qc.invalidateQueries({ queryKey: ['user-post-count'] });
  // ⚠️ 프리미엄 무료 혜택(freebies/freebies_count)은 서버가 등록 시점에 차감한다.
  //    프로필 캐시(staleTime 5분)를 그대로 두면 소진 후에도 앱이 "무료 등록 가능"으로 판단해
  //    결제 정보 없이 등록을 시도하고, 서버는 '결제 정보가 누락되었습니다'로 400을 낸다.
  qc.invalidateQueries({ queryKey: USER_KEYS.profile });
}

export function useCancelApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (applyId: number) => cancelApplication(applyId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-applications'] }),
  });
}

export function useDeleteJobPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteJobPost(id),
    onSuccess: () => {
      invalidateJobLists(qc);
      qc.invalidateQueries({ queryKey: ['favorite-sites'] });
    },
  });
}

export function useCreateJobPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: JobPostingPayload) => createJobPost(payload),
    onSuccess: () => invalidateJobLists(qc),
  });
}

export function useUpdateJobPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: JobPostingPayload }) =>
      updateJobPost(id, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['job-detail', String(id)] });
      // 제목/수수료/업종이 바뀌면 목록 카드 내용도 달라진다
      invalidateJobLists(qc);
    },
  });
}

export function useUpdateJobPostImages() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, images }: { id: number; images: string[] }) =>
      updateJobPostImages(id, images),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['job-detail', String(id)] });
    },
  });
}
