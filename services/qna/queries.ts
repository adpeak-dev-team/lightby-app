import { useQuery } from '@tanstack/react-query';
import { getMyQnaPosts, getFaqs } from './api';

export const QNA_QUERY_KEYS = {
  myList: ['qna', 'my-questions'] as const,
  faqs: ['qna', 'faqs'] as const,
};

export function useGetMyQnaPosts() {
  return useQuery({
    queryKey: QNA_QUERY_KEYS.myList,
    queryFn: getMyQnaPosts,
  });
}

export function useGetFaqs() {
  return useQuery({
    queryKey: QNA_QUERY_KEYS.faqs,
    queryFn: getFaqs,
    staleTime: 1000 * 60 * 10,
  });
}
