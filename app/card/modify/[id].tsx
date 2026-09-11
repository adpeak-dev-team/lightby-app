import { useLocalSearchParams } from 'expo-router';

import { CardEditorView } from '@/components/card/CardEditorView';

/** /card/modify/{id} — 명함 수정. */
export default function ModifyCardPage() {
    const { id } = useLocalSearchParams<{ id?: string }>();
    const cardId = id ? Number(id) : NaN;
    return <CardEditorView cardId={Number.isFinite(cardId) ? cardId : null} />;
}
