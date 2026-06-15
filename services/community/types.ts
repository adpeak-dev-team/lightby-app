export interface CommunityItem {
  id: number;
  user_id: number;
  title: string;
  content: string;
  image?: string[];
  thumbnail?: string;
  profile_thumbnail?: string | null;
  nickname: string;
  is_anonymous: number | boolean;
  is_withdrawn?: number | boolean;
  date: string;
  likes: number;
  comments: number;
  category?: string | null; // 'notice' | 'news' | null(일반)
}

export interface Comment {
  id: number;
  user_id: number;
  board_id: number;
  author_name: string;
  is_withdrawn?: number | boolean;
  content: string;
  created_at: string;
}

export interface CreateCommunityPostPayload {
  user_id: number;
  title: string;
  content: string;
  images: string[];
  thumbnail?: string;
  anonymous: boolean;
}
