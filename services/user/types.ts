export interface FavoriteSiteItem {
  id: number;
  thumbnail: string;
  /** 원본 이미지(imgs[0]) — 카드는 썸네일 대신 이걸 쓴다 */
  image: string | null;
  point: string;
  title: string;
  feeType: string;
  fee: string;
  tags: string[];
  industries?: string[];
  jobCategories?: string[];
  icons: number[];
  is_display?: number; // 1: 진행중, 0: 마감
  created_at?: string | null; // D-day 계산용
}

export interface UserProfile {
  id: number;
  name?: string | null;
  nickname: string;
  phone: string;
  role: string;
  login_id?: string | null;
  sns_type?: string | null;
  gender?: string | null;
  birthday?: string | null;
  introduction?: string | null;
  careers?: string[] | null;
  profile_image?: string | null;
  profile_thumbnail?: string | null;
  industries?: string[] | null;
  job_categories?: string[] | null;
  user_work_regions?: string[] | null;
  freebies?: number;
  freebies_count?: number;
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
  industries?: string[];
  jobCategories?: string[];
  icons: number[];
  product: string;
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
