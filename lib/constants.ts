export const regions = [
  "전국", "서울", "경기남부", "경기북부", "인천",
  "부산", "울산", "대구", "경상도", "대전",
  "세종", "충청도", "광주", "전라도", "강원도", "제주도",
];

export const industries = [
  "아파트", "오피스텔", "도시형생활주택", "호텔",
  "레지던스", "상가/쇼핑몰", "오피스", "지식산업센터",
  "토지", "빌라", "타운하우스", "펜션/풀빌라",
  "전원주택", "기타",
];

export const roles = [
  "시행/대행 사무직", "분양대행사", "본부장", "팀장",
  "직원", "데스크", "TM상담사", "알바",
];

export const ICON_LIST = [
  { id: 1, name: "설거지",   color: "red" },
  { id: 2, name: "수수료UP", color: "blue" },
  { id: 3, name: "소수인원", color: "green" },
  { id: 4, name: "신규현장", color: "yellow" },
  { id: 5, name: "조건변경", color: "violet" },
  { id: 6, name: "할인분양", color: "orange" },
  { id: 7, name: "급구현장", color: "pink" },
  { id: 8, name: "한방현장", color: "teal" },
];

export const ICON_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  red:    { bg: '#fee2e2', text: '#dc2626', border: '#fecaca' },
  blue:   { bg: '#dbeafe', text: '#2563eb', border: '#bfdbfe' },
  green:  { bg: '#dcfce7', text: '#16a34a', border: '#bbf7d0' },
  yellow: { bg: '#fef9c3', text: '#ca8a04', border: '#fef08a' },
  violet: { bg: '#ede9fe', text: '#7c3aed', border: '#ddd6fe' },
  orange: { bg: '#ffedd5', text: '#ea580c', border: '#fed7aa' },
  pink:   { bg: '#fce7f3', text: '#db2777', border: '#fbcfe8' },
  teal:   { bg: '#ccfbf1', text: '#0d9488', border: '#99f6e4' },
};
