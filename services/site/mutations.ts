import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cancelApplication, deleteJobPost, createJobPost, updateJobPost, updateJobPostImages, JobPostingPayload } from './api';

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
      qc.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}

export function useUpdateJobPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: JobPostingPayload }) =>
      updateJobPost(id, payload),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['job-detail', String(id)] });
      qc.invalidateQueries({ queryKey: ['my-job-postings'] });
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
