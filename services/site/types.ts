export interface JobPostDetail {
  id: number;
  user_id: number;
  subject: string;
  imgs: string[];
  thumbnail: string | null;
  point_content: string | null;
  address: string;
  result_address: string;
  latitude: number | null;
  longitude: number | null;
  regions: string[];
  industries: string[];
  job_categories: string[];
  agency: string;
  name: string;
  phone: string;
  career_period: string | null;
  number_people: string | null;
  fee_type: string | null;
  fee: number;
  daily_expense: string | null;
  accommodation_expenses: string | null;
  promotion: string | null;
  base_pay: string | null;
  detail_content: string | null;
  product: string;
  icons: string;
  view_count?: number;
}

export interface JobSummaryResponse {
  id: number;
  thumbnail: string | null;
  point_content: string | null;
  title: string;
  feeType: string | null;
  fee: number;
  industries: string[];
  jobCategories: string[];
  product: string;
  icons: string | null;
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
