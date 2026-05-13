export interface QnaPost {
  id: number;
  content: string;
  images: string[];
  is_answered: boolean;
  created_at: string;
  answer: { content: string; created_at: string } | null;
}

export interface FaqItem {
  id: number;
  content: string;
  answer: string | null;
}

export interface CreateQnaPostPayload {
  content: string;
  images: string[];
}
