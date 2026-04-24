import { apiClient } from '@/api/apiClient';
import { CommunityItem, Comment } from './types';

export async function getCommunityPosts(): Promise<CommunityItem[]> {
  const { data } = await apiClient.get<{ success: boolean; data: CommunityItem[] }>('/community/posts');
  return data.data;
}

export async function getCommunityPostById(id: number): Promise<CommunityItem> {
  const { data } = await apiClient.get<{ success: boolean; data: CommunityItem }>(`/community/posts/${id}`);
  return data.data;
}

export async function getCommunityReplies(boardId: number): Promise<Comment[]> {
  const { data } = await apiClient.get<{ success: boolean; data: Comment[] }>(`/community/posts/${boardId}/replies`);
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
