import { CardListView } from '@/components/card/CardListView';

/**
 * /mypage/card — 마이페이지에서 들어온 명함 목록.
 *
 * 하단 탭(/card)과 같은 화면이다. 여기로 들어오면 뒤로가기가 마이페이지로
 * 돌아가야 하므로 자체 상단바를 그리는 stack 형태로 띄운다.
 */
export default function CardListPage() {
    return <CardListView variant="stack" />;
}
