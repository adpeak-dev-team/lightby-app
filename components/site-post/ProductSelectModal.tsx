import { useEffect, useMemo, useState } from 'react';
import {
  Modal, View, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Platform,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ICON_LIST, ICON_COLORS } from '@/lib/constants';
import { useSitePricing } from '@/services/site/queries';
import type { IosPostProducts } from '@/services/site/api';
import { loadIosPrices } from '@/lib/iap';

const IS_IOS = Platform.OS === 'ios';

/** 서버 site.constants 의 iosPostProductId 와 같은 규칙 — 표시용. 실제 상품은 서버가 주문 때 정한다 */
function iosComboId(ids: IosPostProducts, product: 'PREMIUM' | 'TOP', withIcon: boolean, freebie: boolean): string | null {
    if (freebie) return withIcon ? ids.icon : null;
    if (product === 'PREMIUM') return withIcon ? ids.premium_icon : ids.premium;
    return withIcon ? ids.top_icon : ids.top;
}

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

// 서버(관리자 결제관리) 응답 실패 시 폴백 — 실제 표시가는 useSitePricing 응답을 우선한다.
// iOS 는 App Store 기준가, 안드로이드는 PayApp 이 청구하는 웹 가격
const FALLBACK_APP_PRICE: Record<'premium' | 'top', number> = IS_IOS ? { premium: 27900, top: 13900 } : { premium: 19900, top: 9900 };
const FALLBACK_APP_ORIGINAL: Record<'premium' | 'top', number> = IS_IOS ? { premium: 55800, top: 27800 } : { premium: 39800, top: 19800 };
const FALLBACK_ICON_PRICE = 2200;

export function ProductSelectModal({ visible, onClose, onConfirm, freebies = false, freebiesLeft = 2, isPending = false }: Props) {
    const [selected, setSelected] = useState<ProductType>('FREE');
    const [selectedIcons, setSelectedIcons] = useState<number[]>([]);

    // 관리자 결제관리(DB) 값 — 실패 시 폴백.
    //  · 안드로이드: PayApp 이 **웹 가격**으로 청구하므로 웹 가격을 보여준다.
    //    (예전엔 app_* 을 보여줘 27,900원이라 적고 19,900원을 청구했다)
    //  · iOS: App Store 가 청구한다. 금액 문자열은 Apple 표시가(iosPrices)를 쓰고,
    //    숫자(ios_price)는 무료/유료 판단과 참고용 합계에만 쓴다.
    const { data: pricing } = useSitePricing();
    const premium = pricing?.products?.find((p) => p.code === 'premium');
    const top = pricing?.products?.find((p) => p.code === 'top');
    const PREMIUM_PRICE = (IS_IOS ? premium?.app_price : premium?.web_price) ?? FALLBACK_APP_PRICE.premium;
    const TOP_PRICE = (IS_IOS ? top?.app_price : top?.web_price) ?? FALLBACK_APP_PRICE.top;
    const PREMIUM_ORIGINAL = (IS_IOS ? premium?.app_original_price : premium?.original_price) || FALLBACK_APP_ORIGINAL.premium;
    const TOP_ORIGINAL = (IS_IOS ? top?.app_original_price : top?.original_price) || FALLBACK_APP_ORIGINAL.top;
    const PREMIUM_DISCOUNT_TEXT = (IS_IOS ? premium?.app_discount_text : premium?.discount_text)?.trim() || null;
    const TOP_DISCOUNT_TEXT = (IS_IOS ? top?.app_discount_text : top?.discount_text)?.trim() || null;
    // 취소선(정가)은 할인율 > 0 이고 원금액이 판매가보다 클 때만 노출.
    // iOS 는 청구액이 Apple 가격표라 우리 정가와 나란히 두면 할인율이 틀어질 수 있어 그리지 않는다.
    const showPremiumOriginal = !IS_IOS && (premium?.discount_rate ?? 50) > 0 && PREMIUM_ORIGINAL > PREMIUM_PRICE;
    const showTopOriginal = !IS_IOS && (top?.discount_rate ?? 50) > 0 && TOP_ORIGINAL > TOP_PRICE;

    // iOS: App Store 표시가. 모달이 열릴 때 한 번 불러온다.
    const iosIds = pricing?.iosProducts;
    const [iosPrices, setIosPrices] = useState<Record<string, string> | null>(null);
    useEffect(() => {
        if (!IS_IOS || !visible || !iosIds) return;
        loadIosPrices(Object.values(iosIds)).then(setIosPrices).catch(() => setIosPrices({}));
    }, [visible, iosIds]);
    const iosText = (id: string | null | undefined) => (id && iosPrices?.[id]) || null;

    // 선택 가능한 아이콘 목록 (DB 우선). 앱은 웹과 동일한 개당 가격 사용.
    const iconList = useMemo(
        () => pricing?.icons?.length ? pricing.icons : ICON_LIST.map((i) => ({ ...i, price: FALLBACK_ICON_PRICE })),
        [pricing],
    );
    const iconPriceOf = (id: number) => iconList.find((i) => i.id === id)?.price ?? FALLBACK_ICON_PRICE;

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
    const iconsTotal = selectedIcons.reduce((sum, id) => sum + iconPriceOf(id), 0);
    const totalAmount = basePrice + iconsTotal;

    const productName = selected === 'PREMIUM' ? '프리미엄' : selected === 'TOP' ? '지역 탑' : '무료 등록';
    const showIcons = selected !== 'FREE';

    // 등록 버튼 텍스트 — 무료 흐름(FREE 또는 freebies로 총액 0)이면 '무료로 등록', 아니면 '결제하고 등록'
    const isFreeFlow = selected === 'FREE' || totalAmount === 0;

    // iOS 금액 표시 — 이 조합으로 실제로 살 App Store 상품의 가격
    const freebieApplied = freebies && selected === 'PREMIUM';
    const comboId = IS_IOS && iosIds && selected !== 'FREE'
        ? iosComboId(iosIds, selected, selectedIcons.length > 0, freebieApplied)
        : null;
    const won = (n: number) => `${n.toLocaleString()}원`;
    const premiumPriceText = IS_IOS ? iosText(iosIds?.premium) ?? '-' : won(PREMIUM_PRICE);
    const topPriceText = IS_IOS ? iosText(iosIds?.top) ?? '-' : won(TOP_PRICE);
    const baseText = IS_IOS
        ? (selected === 'FREE' || freebieApplied ? '0원' : iosText(selected === 'PREMIUM' ? iosIds?.premium : iosIds?.top) ?? '-')
        : won(basePrice);
    const totalText = IS_IOS ? (isFreeFlow ? '0원' : iosText(comboId) ?? '-') : won(totalAmount);
    // iOS 는 App Store 가격을 못 불러오면 결제를 열 수 없다(상품이 아직 등록 전이거나 네트워크 문제)
    const iosPriceMissing = IS_IOS && !isFreeFlow && !iosText(comboId);

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
                                        {/* 무료 혜택이 남아있으면 잔여 횟수를, 아니면 관리자 결제관리(app_discount_text)를 우선 노출 */}
                                        {(freebies || PREMIUM_DISCOUNT_TEXT) && (
                                            <View style={s.discountChip}>
                                                <Text style={s.discountChipText}>
                                                    {freebies ? `무료 ${freebiesLeft}회 가능` : PREMIUM_DISCOUNT_TEXT}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                    <View style={s.productPriceWrap}>
                                        {!freebies && showPremiumOriginal && (
                                            <Text style={s.productOriginalPrice}>{PREMIUM_ORIGINAL.toLocaleString()}원</Text>
                                        )}
                                        <Text style={[s.productPrice, freebies && { color: '#3b82f6' }]}>
                                            {freebies ? '0원 (무료)' : premiumPriceText}
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
                                        {TOP_DISCOUNT_TEXT && (
                                            <View style={s.discountChip}>
                                                <Text style={s.discountChipText}>{TOP_DISCOUNT_TEXT}</Text>
                                            </View>
                                        )}
                                    </View>
                                    <View style={s.productPriceWrap}>
                                        {showTopOriginal && (
                                            <Text style={s.productOriginalPrice}>{TOP_ORIGINAL.toLocaleString()}원</Text>
                                        )}
                                        <Text style={s.productPrice}>{topPriceText}</Text>
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
                                    <Text style={s.iconTitle}>아이콘 <Text style={s.iconSub}>{IS_IOS ? '(결제 금액에 포함)' : `(개당 ${FALLBACK_ICON_PRICE.toLocaleString()}원~)`}</Text></Text>
                                    <Text style={s.iconLimit}>1개 선택 가능</Text>
                                </View>
                                <View style={s.iconGrid}>
                                    {iconList.map((icon) => {
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
                                <Text style={s.summaryValue}>{productName}  {baseText}</Text>
                            </View>
                            {selectedIcons.map((id) => {
                                const icon = iconList.find((i) => i.id === id);
                                return (
                                    <View key={id} style={s.summaryRow}>
                                        <Text style={s.summaryLabel}>아이콘: {icon?.name}</Text>
                                        <Text style={s.summaryValue}>{IS_IOS ? '포함' : won(iconPriceOf(id))}</Text>
                                    </View>
                                );
                            })}
                            <View style={s.summaryDivider} />
                            <View style={s.summaryRow}>
                                <Text style={s.summaryTotalLabel}>최종 금액</Text>
                                <Text style={[s.summaryTotal, freebies && selected === 'PREMIUM' && s.summaryTotalFree]}>
                                    {freebieApplied && selectedIcons.length === 0 ? '0원' : totalText}
                                </Text>
                            </View>
                        </View>
                    </ScrollView>

                    {/* 등록 버튼 — 무료면 바로 등록, 유료면 PayApp 결제창 오픈(호출부에서 처리) */}
                    <View style={s.footer}>
                        {/* 법인 결제 안내 — 유료 결제일 때만 */}
                        {!isFreeFlow && !IS_IOS && (
                            <View style={s.payNotice}>
                                <Text style={s.payNoticeText}>
                                    결제 시 법인카드가 지원되지 않으니, 계좌이체로 결제해 주세요.
                                </Text>
                            </View>
                        )}
                        <TouchableOpacity
                            onPress={() => onConfirm(selected, selectedIcons, totalAmount)}
                            disabled={isPending || iosPriceMissing}
                            activeOpacity={0.85}
                            style={(isPending || iosPriceMissing) && { opacity: 0.6 }}
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
                                        {isFreeFlow ? '무료로 등록하기' : iosPriceMissing ? '결제 정보를 불러오는 중…' : '결제 및 등록하기'}
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
