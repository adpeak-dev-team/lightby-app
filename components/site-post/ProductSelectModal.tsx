import { useState } from 'react';
import {
  Modal, View, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ICON_LIST, ICON_COLORS } from '@/lib/constants';

export type ProductType = 'FREE' | 'TOP' | 'PREMIUM';

interface Props {
    visible: boolean;
    onClose: () => void;
    onConfirm: (product: ProductType, selectedIcons: number[], totalAmount: number) => void;
    freebies?: boolean;
    /** 남은 프리미엄 무료 혜택 횟수 (총 2회) */
    freebiesLeft?: number;
    isPending?: boolean;
}

// 오픈기념 50% 할인가 (표시용). 실제 청구가는 서버가 DB 가격표로 재확정한다 — 여기 값은 UI 참고용.
const PREMIUM_PRICE = 27900;
const TOP_PRICE = 13900;
const ICON_PRICE = 2200;

export function ProductSelectModal({ visible, onClose, onConfirm, freebies = false, freebiesLeft = 2, isPending = false }: Props) {
    const [selected, setSelected] = useState<ProductType>('FREE');
    const [selectedIcons, setSelectedIcons] = useState<number[]>([]);

    const handleSelect = (p: ProductType) => {
        setSelected(p);
        if (p === 'FREE') setSelectedIcons([]);
    };

    const handleIconToggle = (id: number) => {
        setSelectedIcons((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [id]);
    };

    const basePrice = selected === 'PREMIUM'
        ? (freebies ? 0 : PREMIUM_PRICE)
        : selected === 'TOP' ? TOP_PRICE : 0;
    const totalAmount = basePrice + selectedIcons.length * ICON_PRICE;

    const productName = selected === 'PREMIUM' ? '프리미엄' : selected === 'TOP' ? '지역 탑' : '무료 등록';
    const showIcons = selected !== 'FREE';

    // 등록 버튼 텍스트 — 무료 흐름(FREE 또는 freebies로 총액 0)이면 '무료로 등록', 아니면 '결제하고 등록'
    const isFreeFlow = selected === 'FREE' || totalAmount === 0;

    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
            <View style={s.overlay}>
                <View style={s.card}>
                    {/* 헤더 — 웹과 동일하게 가운데 정렬, 닫기는 우상단 원형 버튼 */}
                    <View style={s.header}>
                        {/* 무료 혜택 여부와 무관하게 항상 같은 제목.
                            혜택은 프리미엄 카드의 빨간 칩("무료 N회 가능")이 알려준다. */}
                        <Text style={s.headerTitle}>상품 선택 및 결제</Text>
                        <Text style={s.headerSub}>원하시는 노출 옵션을 선택해 주세요.</Text>
                        <TouchableOpacity style={s.closeBtn} onPress={onClose} hitSlop={8} disabled={isPending}>
                            <Ionicons name="close" size={20} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.body}>
                        {/* 상품 선택 */}
                        <View style={s.productList}>
                            {/* 프리미엄 */}
                            <TouchableOpacity
                                style={[s.productCard, selected === 'PREMIUM' && s.productCardActive]}
                                onPress={() => handleSelect('PREMIUM')}
                                activeOpacity={0.8}
                            >
                                <View style={s.productRow}>
                                    <View style={s.productLeft}>
                                        <View style={[s.productBadge, { backgroundColor: '#10b981' }]}>
                                            <Text style={s.productBadgeText}>프리미엄</Text>
                                        </View>
                                        {/* 웹의 discount_text 칩 — 무료 혜택이 남아있으면 잔여 횟수를, 아니면 오픈기념 할인율 */}
                                        <View style={s.discountChip}>
                                            <Text style={s.discountChipText}>
                                                {freebies ? `무료 ${freebiesLeft}회 가능` : '오픈 기념 50% 할인'}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={s.productPriceWrap}>
                                        <Text style={s.productOriginalPrice}>55,800원</Text>
                                        <Text style={[s.productPrice, freebies && { color: '#3b82f6' }]}>
                                            {freebies ? '0원 (무료)' : `${PREMIUM_PRICE.toLocaleString()}원`}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={s.productDesc}>• 메인 + 지역페이지 최상단 랜덤 노출{'\n'}• 광고 기간 10일 제공</Text>
                            </TouchableOpacity>

                            {/* 지역 탑 */}
                            <TouchableOpacity
                                style={[s.productCard, selected === 'TOP' && s.productCardActive]}
                                onPress={() => handleSelect('TOP')}
                                activeOpacity={0.8}
                            >
                                <View style={s.productRow}>
                                    <View style={s.productLeft}>
                                        <View style={[s.productBadge, { backgroundColor: '#3b82f6' }]}>
                                            <Text style={s.productBadgeText}>지역 탑</Text>
                                        </View>
                                        <View style={s.discountChip}>
                                            <Text style={s.discountChipText}>오픈 기념 50% 할인</Text>
                                        </View>
                                    </View>
                                    <View style={s.productPriceWrap}>
                                        <Text style={s.productOriginalPrice}>27,800원</Text>
                                        <Text style={s.productPrice}>{TOP_PRICE.toLocaleString()}원</Text>
                                    </View>
                                </View>
                                <Text style={s.productDesc}>• 선택한 지역페이지 상단 랜덤 노출{'\n'}• 광고 기간 10일 제공</Text>
                            </TouchableOpacity>

                            {/* 무료 */}
                            <TouchableOpacity
                                style={[s.productCard, selected === 'FREE' && s.productCardActive]}
                                onPress={() => handleSelect('FREE')}
                                activeOpacity={0.8}
                            >
                                <View style={s.productRow}>
                                    <View style={s.productLeft}>
                                        <View style={[s.productBadge, { backgroundColor: '#e2e8f0' }]}>
                                            <Text style={[s.productBadgeText, s.productBadgeMuted]}>무료 공고</Text>
                                        </View>
                                    </View>
                                    <Text style={s.productPrice}>무료 등록</Text>
                                </View>
                                <Text style={s.productDesc}>• 노출 기간 10일 제공</Text>
                            </TouchableOpacity>
                        </View>

                        {/* 아이콘 선택 */}
                        {showIcons ? (
                            <View style={s.iconSection}>
                                <View style={s.iconHeader}>
                                    <Text style={s.iconTitle}>포인트 아이콘 <Text style={s.iconSub}>(개당 2,200원)</Text></Text>
                                    <Text style={s.iconLimit}>1개 선택 가능</Text>
                                </View>
                                <View style={s.iconGrid}>
                                    {ICON_LIST.map((icon) => {
                                        const c = ICON_COLORS[icon.color] ?? { bg: '#f1f5f9', border: '#e2e8f0', text: '#64748b' };
                                        const isSelected = selectedIcons.includes(icon.id);
                                        return (
                                            <TouchableOpacity
                                                key={icon.id}
                                                style={[s.iconItem, { backgroundColor: c.bg, borderColor: isSelected ? '#10b981' : c.border }, isSelected && s.iconItemSelected]}
                                                onPress={() => handleIconToggle(icon.id)}
                                                activeOpacity={0.75}
                                            >
                                                <Text style={[s.iconItemText, { color: c.text }]}>{icon.name}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        ) : (
                            <View style={s.freeNote}>
                                <Text style={s.freeNoteText}>
                                    무료 등록 시 게시글은 10일 동안 유지됩니다.{'\n'}이후 재노출을 원하실 경우 재등록해 주세요.{'\n'}아이콘 선택은 프리미엄 또는 지역탑 등록 시 가능합니다.
                                </Text>
                            </View>
                        )}

                        {/* 결제 요약 */}
                        <View style={s.summary}>
                            <View style={s.summaryRow}>
                                <Text style={s.summaryLabel}>선택 상품</Text>
                                <Text style={s.summaryValue}>{productName}  {basePrice.toLocaleString()}원</Text>
                            </View>
                            {selectedIcons.map((id) => {
                                const icon = ICON_LIST.find((i) => i.id === id);
                                return (
                                    <View key={id} style={s.summaryRow}>
                                        <Text style={s.summaryLabel}>아이콘: {icon?.name}</Text>
                                        <Text style={s.summaryValue}>{ICON_PRICE.toLocaleString()}원</Text>
                                    </View>
                                );
                            })}
                            <View style={s.summaryDivider} />
                            <View style={s.summaryRow}>
                                <Text style={s.summaryTotalLabel}>최종 금액</Text>
                                <Text style={[s.summaryTotal, freebies && selected === 'PREMIUM' && s.summaryTotalFree]}>
                                    {freebies && selected === 'PREMIUM' ? '0원' : `${totalAmount.toLocaleString()}원`}
                                </Text>
                            </View>
                        </View>
                    </ScrollView>

                    {/* 등록 버튼 — 무료면 바로 등록, 유료면 PayApp 결제창 오픈(호출부에서 처리) */}
                    <View style={s.footer}>
                        {/* 법인 결제 안내 — 유료 결제일 때만 */}
                        {!isFreeFlow && (
                            <View style={s.payNotice}>
                                <Text style={s.payNoticeText}>
                                    법인(사업자) 결제 시에는 법인카드가 지원되지 않으니, 계좌이체로 결제해 주세요.
                                </Text>
                            </View>
                        )}
                        <TouchableOpacity
                            onPress={() => onConfirm(selected, selectedIcons, totalAmount)}
                            disabled={isPending}
                            activeOpacity={0.85}
                            style={isPending && { opacity: 0.6 }}
                        >
                            {/* 웹과 동일: emerald-500 → teal-600 좌우 그라데이션 */}
                            <LinearGradient
                                colors={['#10b981', '#0d9488']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={s.confirmBtn}
                            >
                                {isPending
                                    ? <ActivityIndicator size="small" color="#fff" />
                                    : <Text style={s.confirmBtnText}>
                                        {isFreeFlow ? '무료로 등록하기' : '결제 및 등록하기'}
                                    </Text>}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 24,
        maxHeight: '85%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 12,
        overflow: 'hidden',
    },
    header: {
        alignItems: 'center',
        // 좌우 56 — 가운데 정렬된 제목이 우상단 X 버튼(36px)과 겹치지 않도록 확보
        paddingHorizontal: 56,
        paddingTop: 40,
        paddingBottom: 24,
    },
    closeBtn: {
        position: 'absolute', top: 16, right: 16,
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
    headerSub: { fontSize: 14, color: '#64748b', marginTop: 4 },
    body: { paddingHorizontal: 20, paddingBottom: 24, gap: 24 },
    productList: { gap: 12 },
    productCard: {
        borderWidth: 1,
        borderColor: '#f1f5f9',
        borderRadius: 12,
        padding: 16,
    },
    // 웹은 체크 아이콘 없이 테두리 + 옅은 에메랄드 틴트로만 선택을 표현한다
    productCardActive: {
        borderColor: '#10b981',
        backgroundColor: 'rgba(236,253,245,0.3)',
    },
    productRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    // 선택 체크는 뱃지 바로 옆(왼쪽 그룹)에 둔다.
    // 예전엔 position:absolute로 카드 우상단에 띄웠는데, 우측 정렬된 가격과 정확히 겹쳤다.
    productLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
    productBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    productBadgeText: { fontSize: 10, fontWeight: '400', color: '#fff' },
    // 무료 공고 뱃지만 회색 배경 + 진한 회색 글씨(웹과 동일)
    productBadgeMuted: { color: '#475569' },
    // 할인/혜택 칩 (웹: bg-red-50 text-red-500 font-semibold)
    discountChip: {
        backgroundColor: '#fef2f2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
    },
    discountChipText: { fontSize: 10, fontWeight: '600', color: '#ef4444' },
    productPriceWrap: { alignItems: 'flex-end', flexShrink: 0 },
    productOriginalPrice: { fontSize: 12, color: '#94a3b8', textDecorationLine: 'line-through' },
    productPrice: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
    productDesc: { fontSize: 11, color: '#64748b', lineHeight: 18, marginTop: 8 },
    iconSection: {
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        gap: 16,
    },
    iconHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    iconTitle: { fontSize: 14, fontWeight: '700', color: '#334155' },
    iconSub: { fontSize: 12, fontWeight: '400', color: '#94a3b8' },
    iconLimit: { fontSize: 10, color: '#64748b', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    iconItem: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1.5,
    },
    iconItemSelected: { borderWidth: 2 },
    iconItemText: { fontSize: 14, fontWeight: '400' },
    freeNote: {
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#e2e8f0',
    },
    freeNoteText: { fontSize: 12, color: '#94a3b8', textAlign: 'center', lineHeight: 18 },
    summary: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        padding: 20,
        gap: 4,
    },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
    summaryLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
    summaryValue: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
    summaryDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginTop: 12, marginBottom: 12 },
    summaryTotalLabel: { fontSize: 16, fontWeight: '700', color: '#fff' },
    // 웹: 평소엔 흰색, 첫 글 무료 혜택으로 0원일 때만 에메랄드
    summaryTotal: { fontSize: 20, fontWeight: '800', color: '#fff' },
    summaryTotalFree: { color: '#34d399' },
    footer: { paddingHorizontal: 20, paddingBottom: 20 },
    // 법인 결제 안내 (앰버 톤 — 웹과 동일 메시지)
    payNotice: {
        backgroundColor: '#fffbeb',
        borderWidth: 1,
        borderColor: '#fde68a',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        marginBottom: 12,
    },
    payNoticeText: { fontSize: 12, lineHeight: 18, color: '#b45309' },
    confirmBtn: {
        borderRadius: 16,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmBtnText: { fontSize: 18, fontWeight: '800', color: '#fff' },
});
