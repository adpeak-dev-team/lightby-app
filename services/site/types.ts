export interface FeeItem {
  category: string;
  amount: string;
}

export interface JobPostDetail {
  id: number;
  user_id: number;
  subject: string;
  imgs: string[];
  thumbnail: string | null;
  point_content: string | null;
  address: string;
  address_detail: string | null;
  result_address: string;
  latitude: number | null;
  longitude: number | null;
  regions: string[];
  industries: string[];
  job_categories: string[];
  enforcement: string;
  construction: string;
  agency: string;
  name: string;
  phone: string;
  require_age: string | null;
  require_gender: string | null;
  career_period: string | null;
  number_people: string | null;
  fee_type: string | null;
  fee: FeeItem[] | null;
  fee_max: number;
  meal_expense: string | null;
  transport_expense: string | null;
  housing: string | null;
  accommodation_expenses: string | null;
  daily_expense: string | null;
  business_expense: string | null;
  promotion: string | null;
  base_pay: string | null;
  detail_content: string | null;
  site_url: string | null;
  product: string;
  icons: string;
  total_sum?: number;
  created_at?: string;
  updated_at?: string;
  is_display?: number;
  ad_start_date?: string | null;
  ad_end_date?: string | null;
  view_count?: number;
}

export interface JobSummaryResponse {
  id: number;
  thumbnail: string | null;
  point_content: string | null;
  title: string;
  feeType: string | null;
  fee: FeeItem[] | null;
  fee_max: number;
  industries: string[];
  jobCategories: string[];
  product: string;
  icons: string | null;
  is_display?: number; // 1: 진행중, 0: 마감
  created_at?: string | null; // 공고 생성일 (D-day 계산용)
}

export interface MainStats {
  newSiteCount: number;
  todayVisitors: number;
}

export interface ApplicationItem {
  apply_id: number;
  site_idx: number;
  subject: string;
  thumbnail: string | null;
  status: 'read' | 'unread';
  created_at: string;
}

export interface ApplicantItem {
  idx: number;
  post: string;
  thumbnail: string | null;
  is_display: boolean;
  created_at: string;
  allcount: number;
  unreads_num: number;
}

export interface MyPostSummary {
  id: number;
  subject: string;
  thumbnail: string | null;
  created_at: string;
  is_display: number;
}

export interface ApplicantProfile {
  apply_id: number;
  user_id: number;
  name: string;
  nickname: string;
  phone?: string | null;
  gender?: string | null;
  birthday?: string | null;
  introduction?: string | null;
  careers?: string[] | null;
  profile_thumbnail?: string | null;
  status: 'read' | 'unread';
  created_at: string;
}
