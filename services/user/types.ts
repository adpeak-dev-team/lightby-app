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
  name?: string | null;
  nickname: string;
  phone: string;
  role: string;
  gender?: string | null;
  birthday?: string | null;
  introduction?: string | null;
  careers?: string[] | null;
  profile_image?: string | null;
  profile_thumbnail?: string | null;
  industries?: string[] | null;
  job_categories?: string[] | null;
  user_work_regions?: string[] | null;
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
