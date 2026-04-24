import { apiClient } from '@/api/apiClient';
import { JobSummaryResponse, JobPostDetail, ApplicationItem, ApplicantItem } from './types';

export async function getJobDetail(id: string): Promise<JobPostDetail> {
  const { data } = await apiClient.get<{ success: boolean; data: JobPostDetail }>(`/detail/get-job-detail?id=${id}`);
  return data.data;
}

export async function incrementSiteView(id: string): Promise<void> {
  await apiClient.post(`/detail/view/${id}`);
}

export async function applyToJob(siteIdx: number): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.post(`/job-posting/apply/${siteIdx}`);
  return data;
}

export async function getLikeStatus(siteId: number): Promise<{ liked: boolean }> {
  const { data } = await apiClient.get(`/user/like-status?site_id=${siteId}`);
  return data;
}

export async function toggleSiteLike(siteId: number): Promise<{ liked: boolean; message: string }> {
  const { data } = await apiClient.post('/user/toggle-like', { site_id: siteId });
  return data;
}

export async function getMyApplications(): Promise<{ items: ApplicationItem[] }> {
  const { data } = await apiClient.get('/job-posting/my-applications');
  return data;
}

export async function cancelApplication(applyId: number): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.post(`/job-posting/cancel-application/${applyId}`);
  return data;
}

export async function getMyJobPostings(): Promise<{ items: ApplicantItem[] }> {
  const { data } = await apiClient.get('/job-posting/my-job-postings');
  return data;
}

export async function deleteJobPost(id: number): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.post(`/job-posting/posts/${id}/delete`);
  return data;
}

interface GetJobsByProductParams {
  product: 'PREMIUM' | 'TOP' | 'FREE';
  search?: string;
  sort?: string;
  location?: string;
  limit?: number;
  start?: number;
}

export async function getJobsByProduct(params: GetJobsByProductParams): Promise<JobSummaryResponse[]> {
  const payload: Record<string, unknown> = { product: params.product };
  if (params.search)             payload.search   = params.search;
  if (params.sort)               payload.sort     = params.sort;
  if (params.location)           payload.location = params.location;
  if (params.limit !== undefined) payload.limit   = params.limit;
  if (params.start !== undefined) payload.start   = params.start;

  const { data } = await apiClient.post('/main/by-product', payload);
  return data.items || [];
}
