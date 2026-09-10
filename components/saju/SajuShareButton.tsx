import { useState } from 'react';
import { Share, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';
import { Ionicons } from '@expo/vector-icons';

/**
 * 사주 결과 공유.
 *
 * 앱은 웹과 달리 클립보드 폴백이 필요 없다 — RN 의 Share 는 iOS·안드로이드 모두
 * OS 공유 시트를 띄우므로 카톡·문자로 바로 넘어간다.
 *
 * 빈 줄 정리는 여기서 한다. 호출부가 조건부로 넘긴 `''` 를 그대로 join 하면
 * 공유 글에 빈 줄이 두세 개씩 생긴다.
 */
export function SajuShareButton({
    title,
    lines,
    label = '결과 공유',
}: {
    title: string;
    lines: (string | null | undefined | false)[];
    label?: string;
}) {
    const [busy, setBusy] = useState(false);

    const run = async () => {
        if (busy) return;
        setBusy(true);
        try {
            const body = lines
                .filter((l) => l !== null && l !== undefined && l !== false && l !== '')
                .join('\n');
            await Share.share({ title, message: `${body}\n\n— 번개분양 사주` });
        } catch {
            // 사용자가 공유창을 닫은 경우가 대부분이다. 실패로 알리지 않는다.
        } finally {
            setBusy(false);
        }
    };

    return (
        <TouchableOpacity style={s.btn} onPress={run} disabled={busy} activeOpacity={0.85}>
            <Ionicons name="share-social-outline" size={17} color="#fff" />
            <Text style={s.text}>{label}</Text>
        </TouchableOpacity>
    );
}

const s = StyleSheet.create({
    btn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        backgroundColor: '#2563eb', borderRadius: 14, paddingVertical: 14, marginTop: 12,
    },
    text: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
