import { apiClient } from '@/api/apiClient';
import { CommunityItem, Comment, CreateCommunityPostPayload } from './types';

export interface CommunityPostsPage {
  data: CommunityItem[];
  page: number;
  limit: number;
  hasMore: boolean;
}

export async function getCommunityPosts(search?: string, category?: string, page = 1, limit = 10, viewerId?: number): Promise<CommunityPostsPage> {
  const { data } = await apiClient.get<{
    success: boolean; data: CommunityItem[]; page: number; limit: number; hasMore: boolean;
  }>('/community/posts', {
    params: { ...(search ? { search } : {}), ...(category ? { category } : {}), page, limit, ...(viewerId ? { viewerId } : {}) },
  });
  return { data: data.data, page: data.page, limit: data.limit, hasMore: data.hasMore };
}

export async function getCommunityPostById(id: number, viewerId?: number): Promise<CommunityItem> {
  const { data } = await apiClient.get<{ success: boolean; data: CommunityItem }>(`/community/posts/${id}`, {
    params: { ...(viewerId ? { viewerId } : {}) },
  });
  return data.data;
}

export async function getCommunityReplies(boardId: number, viewerId?: number): Promise<Comment[]> {
  const { data } = await apiClient.get<{ success: boolean; data: Comment[] }>(`/community/posts/${boardId}/replies`, {
    params: { ...(viewerId ? { viewerId } : {}) },
  });
  return data.data;
}

// ==================== 신고 / 차단 (App Store 1.2) ====================
export async function reportContent(
  reporterId: number,
  targetType: 'board' | 'reply',
  targetId: number,
  reason: string,
): Promise<void> {
  await apiClient.post('/community/report', { reporterId, targetType, targetId, reason });
}

export async function blockUser(blockerId: number, blockedId: number): Promise<void> {
  await apiClient.post('/community/block', { blockerId, blockedId });
}

export async function unblockUser(blockerId: number, blockedId: number): Promise<void> {
  await apiClient.post('/community/unblock', { blockerId, blockedId });
}

export interface BlockedUser {
  user_id: number;
  nickname: string | null;
  created_at: string;
}

export async function getBlockedUsers(userId: number): Promise<BlockedUser[]> {
  const { data } = await apiClient.get<{ success: boolean; data: BlockedUser[] }>('/community/blocks', {
    params: { userId },
  });
  return data.data;
}

export async function checkLikeStatus(postId: number, userId: number): Promise<{ liked: boolean }> {
  const { data } = await apiClient.get<{ success: boolean; data: { liked: boolean } }>(
    `/community/posts/${postId}/like-status?userId=${userId}`
  );
  return data.data;
}

export async function toggleLike(postId: number, userId: number): Promise<{ liked: boolean }> {
  const { data } = await apiClient.post<{ success: boolean; liked: boolean }>(
    `/community/posts/${postId}/like`,
    { user_id: userId }
  );
  return { liked: data.liked };
}

export async function createReply(boardId: number, content: string, userId: number): Promise<void> {
  await apiClient.post('/community/replies', { board_id: boardId, content, user_id: userId });
}

export async function deleteReply(replyId: number): Promise<void> {
  await apiClient.post(`/community/replies/${replyId}/delete`);
}

export async function deleteBoardPost(postId: number, userId: number): Promise<void> {
  await apiClient.post(`/community/posts/${postId}/delete`, { user_id: userId });
}

export async function incrementCommunityView(postId: number): Promise<void> {
  await apiClient.post(`/community/posts/${postId}/view`);
}

export async function createCommunityPost(payload: CreateCommunityPostPayload) {
  const { data } = await apiClient.post('/community/upload-posts', payload);
  return data as { success: boolean; message?: string; data?: any };
}

export async function updateCommunityPost(
  id: number,
  payload: { title: string; content: string; images: string[] },
): Promise<{ success: boolean; message?: string }> {
  const { data } = await apiClient.post(`/community/posts/${id}/update`, payload);
  return data;
}

export async function updateCommunityPostImages(id: number, images: string[]): Promise<{ success: boolean }> {
  const { data } = await apiClient.post(`/community/posts/${id}/update-images`, { images });
  return data;
}
