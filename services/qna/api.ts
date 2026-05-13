import { apiClient } from '@/api/apiClient';
import type { QnaPost, FaqItem, CreateQnaPostPayload } from './types';

export async function createQnaPost(payload: CreateQnaPostPayload): Promise<{ success: boolean; message: string; id: number }> {
  const { data } = await apiClient.post('/qna/questions', payload);
  return data;
}

export async function getMyQnaPosts(): Promise<QnaPost[]> {
  const { data } = await apiClient.get<{ success: boolean; data: QnaPost[] }>('/qna/my-questions');
  return data.data;
}

export async function getFaqs(): Promise<FaqItem[]> {
  const { data } = await apiClient.get<{ success: boolean; data: FaqItem[] }>('/qna/faqs');
  return data.data;
}
