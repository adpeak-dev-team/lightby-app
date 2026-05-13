import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createQnaPost } from './api';
import { QNA_QUERY_KEYS } from './queries';

export function useCreateQnaPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createQnaPost,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QNA_QUERY_KEYS.myList });
    },
  });
}
