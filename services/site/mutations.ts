import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cancelApplication, deleteJobPost, createJobPost, JobPostingPayload } from './api';

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
      qc.invalidateQueries({ queryKey: ['my-job-postings'] });
      qc.invalidateQueries({ queryKey: ['user-post-count'] });
    },
  });
}

export function useCreateJobPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: JobPostingPayload) => createJobPost(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-job-postings'] });
    },
  });
}
