// 현장소통 게시글 카테고리 (웹 lib/communityCategory와 동일)
// 관리자가 글 등록 시 지정. NULL/'' = 일반 게시글.

export type CommunityCategory = 'notice' | 'news';

export const COMMUNITY_CATEGORY_LABELS: Record<CommunityCategory, string> = {
  notice: '공지',
  news: '뉴스',
};

// 목록 상단 탭 (전체 + 카테고리)
export const COMMUNITY_TABS: { key: 'all' | CommunityCategory; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'notice', label: '공지' },
  { key: 'news', label: '뉴스' },
];
