import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';
import { Ionicons } from '@expo/vector-icons';

import { usePointBalance, usePointPolicies } from '@/services/point/queries';

/**
 * 작성 화면의 적립 안내.
 *
 * 숫자를 하드코딩하지 않는다 — 적립액·하루 건수·글자 조건은 전부 어드민에서
 * 바뀌는 값이라, 화면에 박아 두면 정책을 바꾼 다음 날부터 안내가 거짓말이 된다.
 *
 * 포인트가 꺼져 있거나 그 적립처가 비활성이면 아무것도 그리지 않는다.
 */
export function PointEarnNotice({ code }: { code: 'board_write' | 'site_create' }) {
    const { data: balance } = usePointBalance();
    const { data: policies } = usePointPolicies();

    const p = policies?.find((x) => x.code === code);
    if (!balance?.enabled || !p || p.amount <= 0) return null;

    const parts: string[] = [];
    if (p.dailyCountLimit) parts.push(`하루 ${p.dailyCountLimit}건까지`);
    if (p.bodyRule === 'len' && p.minBodyLength) {
        parts.push(`${p.minBodyLength}자 이상 쓰면`);
    } else if (p.bodyRule === 'image_or_len' && p.minBodyLength) {
        parts.push(`사진을 올리거나 ${p.minBodyLength}자 이상 쓰면`);
    }

    return (
        <View style={s.wrap}>
            <View style={s.head}>
                <Ionicons name="sparkles" size={14} color="#b45309" />
                <Text style={s.title}>
                    {parts.join(' ')} <Text style={s.amount}>{p.amount.toLocaleString('ko-KR')}P</Text>가 쌓입니다
                </Text>
            </View>
            <Text style={s.sub}>
                모은 포인트는 오늘의 운세나 명함 발송에 쓸 수 있어요
                {typeof balance.balance === 'number'
                    ? ` (보유 ${balance.balance.toLocaleString('ko-KR')}P)`
                    : ''}
            </Text>
        </View>
    );
}

const s = StyleSheet.create({
    wrap: {
        backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a',
        borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
        marginHorizontal: 16, marginBottom: 10,
    },
    head: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    title: { fontSize: 13, color: '#78350f', flex: 1 },
    amount: { fontWeight: '800', color: '#b45309' },
    sub: { fontSize: 11, color: '#a16207', marginTop: 3, marginLeft: 19, lineHeight: 16 },
});
