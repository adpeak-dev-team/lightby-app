export interface FavoriteSiteItem {
  id: number;
  thumbnail: string;
  point: string;
  title: string;
  feeType: string;
  fee: string;
  tags: string[];
  icons?: number[];
}

export interface UserProfile {
  id: number;
  login_id: string;
  sns_type: string;
  nickname: string;
  phone: string;
  role: string;
  gender?: string | null;
  birthday?: string | null;
  introduction?: string | null;
  careers?: string[] | null;
  profile_image?: string | null;
  profile_thumbnail?: string | null;
}

export interface UserPostCount {
  jobCount: number;
  boardCount: number;
  total: number;
}

export interface UserJobPostItem {
  id: number;
  thumbnail: string;
  point: string;
  title: string;
  feeType: string;
  fee: string;
  tags: string[];
  icons?: number[];
}

export interface UserBoardPostItem {
  id: number;
  thumbnail: string;
  title: string;
  content: string;
  nickname: string;
  profile_thumbnail: string | null;
  is_anonymous: boolean;
  date: string;
  likes: number;
  comments: number;
}
