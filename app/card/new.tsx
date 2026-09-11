import { CardEditorView } from '@/components/card/CardEditorView';

/** /card/new — 새 명함. 목록(/card)과 주소를 나눠 뒤로가기가 목록으로 간다. */
export default function NewCardPage() {
    return <CardEditorView cardId={null} />;
}
