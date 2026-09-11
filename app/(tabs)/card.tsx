import { View, StyleSheet } from 'react-native';

import Header from '@/components/common/Header';
import { CardListView } from '@/components/card/CardListView';

/**
 * 내 명함 탭.
 *
 * 고객을 만난 그 자리에서 꺼내야 하는 도구라 탭에 고정한다(웹 동일).
 * 마이페이지 안에만 두면 "언제 쓸지 모르는" 물건이라 영영 못 찾는다.
 */
export default function CardTab() {
    return (
        <View style={s.container}>
            <Header />
            <CardListView />
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f1f5f9' },
});
