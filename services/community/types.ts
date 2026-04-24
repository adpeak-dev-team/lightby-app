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
  date: string;
  likes: number;
  comments: number;
}

export interface Comment {
  id: number;
  user_id: number;
  board_id: number;
  author_name: string;
  content: string;
  created_at: string;
}
