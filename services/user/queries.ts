import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getFavoriteSites, getUserProfile, getUserPostCount, getUserJobPostList, getUserBoardPostList, getPreferences, PreferencesData } from './api';
import { FavoriteSiteItem, UserProfile, UserPostCount, UserJobPostItem, UserBoardPostItem } from './types';

export const PREFERENCES_KEYS = {
  preferences: ['user-preferences'] as const,
};

export function useGetPreferences(options?: { enabled?: boolean }) {
  return useQuery<PreferencesData>({
    queryKey: PREFERENCES_KEYS.preferences,
    queryFn: getPreferences,
    staleTime: 1000 * 60 * 5,
    retry: 1,
    ...options,
  });
}

const LIMIT = 20;

export const FAVORITE_KEYS = {
  regions: ['favorite-sites', 'regions'] as const,
  likes: ['favorite-sites', 'likes'] as const,
};

export const USER_KEYS = {
  profile: ['user-profile'] as const,
  postCount: ['user-post-count'] as const,
};

export function useGetUserProfile(options?: { enabled?: boolean }) {
  return useQuery<UserProfile>({
    queryKey: USER_KEYS.profile,
    queryFn: getUserProfile,
    staleTime: 1000 * 60 * 5,
    retry: 1,
    ...options,
  });
}

export function useGetUserPostCount(options?: { enabled?: boolean }) {
  return useQuery<UserPostCount>({
    queryKey: USER_KEYS.postCount,
    queryFn: getUserPostCount,
    staleTime: 1000 * 60 * 3,
    ...options,
  });
}

export const USER_POST_KEYS = {
  count: ['user-post-count'] as const,
  jobs: ['user-post-list', 'jobs'] as const,
  boards: ['user-post-list', 'boards'] as const,
};

export function useGetUserJobPostList() {
  return useInfiniteQuery<UserJobPostItem[]>({
    queryKey: USER_POST_KEYS.jobs,
    queryFn: ({ pageParam }) => getUserJobPostList(pageParam as number, 20),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length === 20 ? (lastPageParam as number) + 20 : undefined,
    staleTime: 0,
  });
}

export function useGetUserBoardPostList() {
  return useInfiniteQuery<UserBoardPostItem[]>({
    queryKey: USER_POST_KEYS.boards,
    queryFn: ({ pageParam }) => getUserBoardPostList(pageParam as number, 20),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length === 20 ? (lastPageParam as number) + 20 : undefined,
    staleTime: 0,
  });
}

export function useGetFavoriteSitesInfinite(tab: 'regions' | 'likes', options?: { enabled?: boolean }) {
  return useInfiniteQuery<FavoriteSiteItem[]>({
    queryKey: tab === 'regions' ? FAVORITE_KEYS.regions : FAVORITE_KEYS.likes,
    queryFn: ({ pageParam }) => getFavoriteSites(tab, pageParam as number, LIMIT),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length === LIMIT ? (lastPageParam as number) + LIMIT : undefined,
    staleTime: 1000 * 60 * 3,
    ...options,
  });
}
