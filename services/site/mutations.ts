import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cancelApplication, deleteJobPost } from './api';

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
