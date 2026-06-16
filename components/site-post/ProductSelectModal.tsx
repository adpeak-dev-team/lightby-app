import { useState } from 'react';
import {
  Modal, View, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Alert,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { Ionicons } from '@expo/vector-icons';
import { ICON_LIST, ICON_COLORS } from '@/lib/constants';
import { isIAPSupported, purchaseProduct, finishIAPTransaction, isUserCancelled, resolveProductId } from '@/lib/iap';
import { verifyIosReceipt } from '@/services/iap/api';

export type ProductType = 'FREE' | 'TOP' | 'PREMIUM';

interface Props {
    visible: boolean;
    onClose: () => void;
    onConfirm: (product: ProductType, selectedIcons: number[], totalAmount: number) => void;
    freebies?: boolean;
    isPending?: boolean;
}

const PREMIUM_PRICE = 66000;
const TOP_PRICE = 49500;
const ICON_PRICE = 2200;

export function ProductSelectModal({ visible, onClose, onConfirm, freebies = false, isPending = false }: Props) {
    const [selected, setSelected] = useState<ProductType>('FREE');
    const [selectedIcons, setSelectedIcons] = useState<number[]>([]);
    const [paymentAlertVisible, setPaymentAlertVisible] = useState(false);
    const [purchasing, setPurchasing] = useState(false);

    // iOS 인앱결제: 상품(아이콘 포함 여부 반영) 구매 → 백엔드 영수증 검증 → 거래완료 → 공고 등록.
    const handlePaidConfirm = async () => {
        const productId = resolveProductId(selected as 'PREMIUM' | 'TOP', selectedIcons.length);
        setPurchasing(true);
        try {
            const { purchase, receipt } = await purchaseProduct(productId);
            await verifyIosReceipt({ receipt, productId }); // 백엔드 Apple 검증 + 결제 확정
            await finishIAPTransaction(purchase);           // 소비성 거래 완료
            onConfirm(selected, selectedIcons, totalAmount);
        } catch (e: any) {
            if (!isUserCancelled(e)) {
                Alert.alert('결제 실패', e?.message ?? '결제에 실패했습니다. 잠시 후 다시 시도해 주세요.');
            }
        } finally {
            setPurchasing(false);
        }
    };

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

    return (
        <>
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
            <View style={s.overlay}>
                <View style={s.card}>
                    {/* 헤더 */}
                    <View style={s.header}>
                        <View style={s.headerIconWrap}>
                            <Ionicons name="storefront-outline" size={22} color="#10b981" />
                        </View>
                        <View style={s.headerTextWrap}>
                            {freebies ? (
                                <>
                                    <Text style={s.headerTitle}>프리미엄 무료 혜택 적용 가능!</Text>
                                    <Text style={s.headerSub}>프리미엄 등록을 무료로 이용하실 수 있습니다.</Text>
                                </>
                            ) : (
                                <>
                                    <Text style={s.headerTitle}>상품 선택</Text>
                                    <Text style={s.headerSub}>원하시는 노출 옵션을 선택해 주세요.</Text>
                                </>
                            )}
                        </View>
                        <TouchableOpacity onPress={onClose} hitSlop={8} disabled={isPending}>
                            <Ionicons name="close" size={20} color="#94a3b8" />
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
                                    <View style={[s.productBadge, { backgroundColor: '#10b981' }]}>
                                        <Text style={s.productBadgeText}>프리미엄</Text>
                                    </View>
                                    <View style={s.productPriceWrap}>
                                        <Text style={s.productOriginalPrice}>132,000원</Text>
                                        <Text style={[s.productPrice, freebies && { color: '#3b82f6' }]}>
                                            {freebies ? '0원 (무료)' : '66,000원'}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={s.productDesc}>• 메인 + 지역페이지 최상단 랜덤 노출{'\n'}• 광고 기간 10일 제공</Text>
                                {selected === 'PREMIUM' && <Ionicons name="checkmark-circle" size={18} color="#10b981" style={s.productCheck} />}
                            </TouchableOpacity>

                            {/* 지역 탑 */}
                            <TouchableOpacity
                                style={[s.productCard, selected === 'TOP' && s.productCardActive]}
                                onPress={() => handleSelect('TOP')}
                                activeOpacity={0.8}
                            >
                                <View style={s.productRow}>
                                    <View style={[s.productBadge, { backgroundColor: '#3b82f6' }]}>
                                        <Text style={s.productBadgeText}>지역 탑</Text>
                                    </View>
                                    <View style={s.productPriceWrap}>
                                        <Text style={s.productOriginalPrice}>99,000원</Text>
                                        <Text style={s.productPrice}>49,500원</Text>
                                    </View>
                                </View>
                                <Text style={s.productDesc}>• 선택한 지역페이지 상단 랜덤 노출{'\n'}• 광고 기간 10일 제공</Text>
                                {selected === 'TOP' && <Ionicons name="checkmark-circle" size={18} color="#10b981" style={s.productCheck} />}
                            </TouchableOpacity>

                            {/* 무료 */}
                            <TouchableOpacity
                                style={[s.productCard, selected === 'FREE' && s.productCardActive]}
                                onPress={() => handleSelect('FREE')}
                                activeOpacity={0.8}
                            >
                                <View style={s.productRow}>
                                    <View style={[s.productBadge, { backgroundColor: '#64748b' }]}>
                                        <Text style={s.productBadgeText}>무료 공고</Text>
                                    </View>
                                    <Text style={s.productPrice}>무료 등록</Text>
                                </View>
                                <Text style={s.productDesc}>• 노출 기간 10일 제공</Text>
                                {selected === 'FREE' && <Ionicons name="checkmark-circle" size={18} color="#10b981" style={s.productCheck} />}
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
                                <Text style={s.summaryTotal}>
                                    {freebies && selected === 'PREMIUM' ? '0원' : `${totalAmount.toLocaleString()}원`}
                                </Text>
                            </View>
                        </View>
                    </ScrollView>

                    {/* 등록 버튼 */}
                    <View style={s.footer}>
                        <TouchableOpacity
                            style={[s.confirmBtn, (isPending || purchasing) && { opacity: 0.6 }]}
                            onPress={() => {
                                const isPaid =
                                    selected === 'TOP' ||
                                    (selected === 'PREMIUM' && !freebies);
                                if (isPaid) {
                                    // iOS는 인앱결제, 그 외(Android/web)는 아직 준비중
                                    if (isIAPSupported()) {
                                        handlePaidConfirm();
                                    } else {
                                        setPaymentAlertVisible(true);
                                    }
                                    return;
                                }
                                onConfirm(selected, selectedIcons, freebies && selected === 'PREMIUM' ? 0 : totalAmount);
                            }}
                            disabled={isPending || purchasing}
                            activeOpacity={0.85}
                        >
                            {(isPending || purchasing)
                                ? <ActivityIndicator size="small" color="#fff" />
                                : <Text style={s.confirmBtnText}>
                                    {freebies || selected === 'FREE' ? '무료로 등록하기' : '등록하기'}
                                </Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>

        {/* 결제 모듈 준비중 모달 */}
        <Modal visible={paymentAlertVisible} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setPaymentAlertVisible(false)}>
            <View style={s.payOverlay}>
                <View style={s.payCard}>
                    <View style={s.payIconWrap}>
                        <Ionicons name="construct-outline" size={36} color="#f59e0b" />
                    </View>
                    <Text style={s.payTitle}>결제 모듈 준비중입니다</Text>
                    <Text style={s.paySub}>인앱 결제 기능은 현재 준비 중입니다.{'\n'}무료 등록을 이용해 주세요.</Text>
                    <TouchableOpacity style={s.payBtn} onPress={() => setPaymentAlertVisible(false)} activeOpacity={0.85}>
                        <Text style={s.payBtnText}>확인</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
        </>
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
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    headerIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#d1fae5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTextWrap: { flex: 1 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
    headerSub: { fontSize: 14, color: '#64748b', marginTop: 2 },
    body: { padding: 16, gap: 12 },
    productList: { gap: 10 },
    productCard: {
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
        borderRadius: 14,
        padding: 14,
    },
    productCardActive: {
        borderColor: '#10b981',
        backgroundColor: '#f0fdf4',
    },
    productRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    productBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    productBadgeText: { fontSize: 10, fontWeight: '400', color: '#fff' },
    productPriceWrap: { alignItems: 'flex-end' },
    productOriginalPrice: { fontSize: 12, color: '#94a3b8', textDecorationLine: 'line-through' },
    productPrice: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
    productDesc: { fontSize: 11, color: '#64748b', lineHeight: 18 },
    productCheck: { position: 'absolute', top: 12, right: 12 },
    iconSection: {
        backgroundColor: '#f8fafc',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        gap: 12,
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
        padding: 16,
        gap: 6,
    },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
    summaryLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
    summaryValue: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
    summaryDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 4 },
    summaryTotalLabel: { fontSize: 16, fontWeight: '700', color: '#fff' },
    summaryTotal: { fontSize: 20, fontWeight: '800', color: '#34d399' },
    footer: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    confirmBtn: {
        backgroundColor: '#10b981',
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
    },
    confirmBtnText: { fontSize: 18, fontWeight: '800', color: '#fff' },
    payOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    payCard: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 28,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 12,
    },
    payIconWrap: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: '#fef3c7',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    payTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 10, textAlign: 'center' },
    paySub: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
    payBtn: {
        width: '100%',
        backgroundColor: '#f59e0b',
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
    },
    payBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
