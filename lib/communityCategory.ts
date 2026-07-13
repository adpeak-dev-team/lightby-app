// 현장소통 게시글 카테고리 (웹 lib/communityCategory와 동일)
// 관리자가 글 등록 시 지정. NULL/'' = 일반 게시글.

export type CommunityCategory = 'notice' | 'news';

// 목록 상단 탭 키. UI 전용 마커('all' = 전체, 'none' = 일반=NULL 필터)를 포함한다.
// 서버는 category='none' 요청을 category IS NULL 로 해석한다.
export type CommunityTabKey = 'all' | CommunityCategory | 'none';

export const COMMUNITY_CATEGORY_LABELS: Record<CommunityCategory, string> = {
  notice: '공지',
  news: '뉴스',
};

// 목록 상단 탭 (전체 + 카테고리 + 일반)
export const COMMUNITY_TABS: { key: CommunityTabKey; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'notice', label: '공지' },
  { key: 'news', label: '뉴스' },
  { key: 'none', label: '일반' },
];
