import { useState, useEffect, useRef } from 'react';
import { Keyboard } from 'react-native';
import {
  View, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PreviousPostingModal } from '@/components/site-post/PreviousPostingModal';
import { ProductSelectModal, ProductType } from '@/components/site-post/ProductSelectModal';
import { PayappWebViewModal } from '@/components/site-post/PayappWebViewModal';
import { useSitePostForm } from '@/services/site/useSitePostForm';

import { ImageSection } from '@/components/site-post/ImageSection';
import { PostInfoSection } from '@/components/site-post/PostInfoSection';
import { RegionSection } from '@/components/site-post/RegionSection';
import { AgencySection } from '@/components/site-post/AgencySection';
import { IndustrySection } from '@/components/site-post/IndustrySection';
import { OccupationSection } from '@/components/site-post/OccupationSection';
import { SalarySection } from '@/components/site-post/SalarySection';
import { DetailSection } from '@/components/site-post/DetailSection';

export default function SitePostPage() {
    const router = useRouter();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

    const form = useSitePostForm();

    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [prevModalVisible, setPrevModalVisible] = useState(false);
    const [productModalVisible, setProductModalVisible] = useState(false);
    const [leaveModalVisible, setLeaveModalVisible] = useState(false);
    const [isDeletingImages, setIsDeletingImages] = useState(false);
    // PayApp WebView 상태 — 결제 요청 성공 후 payurl/orderId 세팅되면 모달 오픈
    const [payapp, setPayapp] = useState<{ payurl: string; orderId: string } | null>(null);
    const pendingActionRef = useRef<any>(null);

    // ── 나가기 확인 ──
    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
            if (form.isSuccessRef.current) return;

            const hasFeeContent = form.fee.some(f => f.category.trim() || f.amount.trim());
            const hasContent =
                form.subject || form.intro || form.imagesRef.current.length > 0 || form.address ||
                form.workRegions || form.enforcement || form.construction ||
                form.agency || form.managerName || form.managerPhone ||
                form.workIndustry.length > 0 || form.workOccupation.length > 0 ||
                form.feeType || hasFeeContent || form.detailContent || form.siteUrl;

            if (!hasContent) return;

            e.preventDefault();
            pendingActionRef.current = e.data.action;
            setLeaveModalVisible(true);
        });
        return unsubscribe;
    }, [navigation, form.subject, form.intro, form.address, form.workRegions,
        form.enforcement, form.construction, form.agency, form.managerName, form.managerPhone,
        form.workIndustry, form.workOccupation, form.feeType, form.fee, form.detailContent, form.siteUrl]);

    const handleConfirmLeave = async () => {
        setIsDeletingImages(true);
        await form.deleteUploadedImages();
        setIsDeletingImages(false);
        setLeaveModalVisible(false);
        if (pendingActionRef.current) {
            navigation.dispatch(pendingActionRef.current);
        }
    };

    // ── 키보드 감지 ──
    useEffect(() => {
        const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        return () => { show.remove(); hide.remove(); };
    }, []);

    const handleSubmit = () => {
        const error = form.validate();
        if (error) return Alert.alert('필수 입력', error);
        setProductModalVisible(true);
    };

    const handleConfirmProduct = (product: ProductType, icons: number[], total: number) => {
        form.confirmProduct(product, icons, total, {
            onCloseModal: () => setProductModalVisible(false),
            onSuccess: () => router.back(),
            // 유료 상품 → PayApp WebView 오픈
            onPayappRequired: (payurl, orderId) => setPayapp({ payurl, orderId }),
        });
    };

    return (
        <View style={s.container}>
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: insets.bottom, backgroundColor: '#fff', zIndex: 10 }} />
            <PreviousPostingModal
                visible={prevModalVisible}
                onClose={() => setPrevModalVisible(false)}
                onSelect={form.loadPreviousPost}
                isLoading={form.isLoadingPrev}
            />
            <ProductSelectModal
                visible={productModalVisible}
                onClose={() => setProductModalVisible(false)}
                onConfirm={handleConfirmProduct}
                freebies={Boolean(form.userProfile?.freebies) && (form.userProfile?.freebies_count ?? 0) < 2}
                isPending={form.isSubmitting}
            />

            {/* PayApp 결제 WebView — 유료 상품 선택 시 payurl/orderId가 세팅되면 오픈 */}
            <PayappWebViewModal
                visible={!!payapp}
                payurl={payapp?.payurl ?? null}
                orderId={payapp?.orderId ?? null}
                onSuccess={() => form.finalizeAfterPayapp(() => router.back())}
                onCancel={() => {/* 취소 안내는 모달이 자체 알림 처리 */}}
                onDismiss={() => setPayapp(null)}
            />

            {/* ── 나가기 확인 모달 ── */}
            <Modal
                visible={leaveModalVisible}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={() => setLeaveModalVisible(false)}
            >
                <View style={s.modalOverlay}>
                    <View style={s.modalCard}>
                        <View style={s.modalIconWrap}>
                            <Ionicons name="alert-circle" size={40} color="#f87171" />
                        </View>
                        <Text style={s.modalTitle}>정말 나가시겠어요?</Text>
                        <Text style={s.modalDesc}>
                            작성 중인 내용은 저장되지 않으며{'\n'}
                            업로드된 이미지도 모두 삭제됩니다.
                        </Text>
                        <View style={s.modalBtnRow}>
                            <TouchableOpacity
                                style={s.modalCancelBtn}
                                onPress={() => setLeaveModalVisible(false)}
                                activeOpacity={0.8}
                            >
                                <Text style={s.modalCancelText}>계속 작성</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[s.modalLeaveBtn, isDeletingImages && { opacity: 0.6 }]}
                                onPress={handleConfirmLeave}
                                disabled={isDeletingImages}
                                activeOpacity={0.8}
                            >
                                {isDeletingImages
                                    ? <ActivityIndicator size="small" color="#fff" />
                                    : <Text style={s.modalLeaveText}>나가기</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ── 네비게이션 헤더 ── */}
            <View style={s.nav}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.navBack}>
                    <Ionicons name="chevron-back" size={24} color="#0f172a" />
                </TouchableOpacity>
                <Text style={s.navTitle}>구인 공고 등록</Text>
                <View style={{ width: 40 }} />
            </View>
            <View style={s.navSubRow}>
                {Boolean(form.userProfile?.freebies) && (form.userProfile?.freebies_count ?? 0) < 2 && (
                    <View style={s.freebiesBadge}>
                        <Ionicons name="gift-outline" size={12} color="#f59e0b" />
                        <Text style={s.freebiesText}>
                            프리미엄 무료 혜택 {2 - (form.userProfile?.freebies_count ?? 0)}회 가능합니다
                        </Text>
                    </View>
                )}
                <TouchableOpacity
                    onPress={() => setPrevModalVisible(true)}
                    style={s.navPrevBtn}
                    disabled={form.isLoadingPrev}
                    activeOpacity={0.75}
                >
                    {form.isLoadingPrev
                        ? <ActivityIndicator size="small" color="#3b82f6" />
                        : <Ionicons name="documents-outline" size={14} color="#3b82f6" />}
                    <Text style={s.navPrevText}>이전 공고 불러오기</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 30 }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={s.sectionCard}>
                    <ImageSection images={form.images} onChange={form.setImages} />
                </View>

                <View style={s.sectionCard}>
                    <PostInfoSection
                        subject={form.subject} onSubjectChange={form.setSubject}
                        intro={form.intro} onIntroChange={form.setIntro}
                    />
                </View>

                <View style={s.sectionCard}>
                    <RegionSection
                        address={form.address}
                        addressDetail={form.addressDetail}
                        onAddressDetailChange={form.setAddressDetail}
                        latitude={form.latitude}
                        longitude={form.longitude}
                        onAddressSelect={(addr, lat, lng) => {
                            form.setAddress(addr);
                            form.setLatitude(lat);
                            form.setLongitude(lng);
                        }}
                        workRegions={form.workRegions}
                        onRegionSelect={form.setWorkRegions}
                    />
                </View>

                <View style={s.sectionCard}>
                    <AgencySection
                        enforcement={form.enforcement} onEnforcementChange={form.setEnforcement}
                        construction={form.construction} onConstructionChange={form.setConstruction}
                        agency={form.agency} onAgencyChange={form.setAgency}
                        managerName={form.managerName} onManagerNameChange={form.setManagerName}
                        managerPhone={form.managerPhone} onManagerPhoneChange={form.setManagerPhone}
                    />
                </View>

                <View style={s.sectionCard}>
                    <IndustrySection
                        workIndustry={form.workIndustry}
                        onToggle={(v) => form.toggleMulti(form.setWorkIndustry, v)}
                    />
                </View>

                <View style={s.sectionCard}>
                    <OccupationSection
                        workOccupation={form.workOccupation}
                        onToggle={(v) => form.toggleMulti(form.setWorkOccupation, v)}
                        requireGender={form.requireGender} onRequireGenderChange={form.setRequireGender}
                        requireAge={form.requireAge} onRequireAgeChange={form.setRequireAge}
                        careerPeriod={form.careerPeriod} onCareerPeriodChange={form.setCareerPeriod}
                        headCount={form.headCount} onHeadCountChange={form.setHeadCount}
                    />
                </View>

                <View style={s.sectionCard}>
                    <SalarySection
                        feeType={form.feeType} onFeeTypeSelect={form.setFeeType}
                        fee={form.fee} onFeeChange={form.setFee}
                        mealExpense={form.mealExpense} onMealExpenseChange={form.setMealExpense}
                        transportExpense={form.transportExpense} onTransportExpenseChange={form.setTransportExpense}
                        housing={form.housing} onHousingChange={form.setHousing}
                        accommodationExpenses={form.accommodationExpenses} onAccommodationExpensesChange={form.setAccommodationExpenses}
                        dailyExpense={form.dailyExpense} onDailyExpenseChange={form.setDailyExpense}
                        businessExpense={form.businessExpense} onBusinessExpenseChange={form.setBusinessExpense}
                        promotion={form.promotion} onPromotionChange={form.setPromotion}
                        baseSalary={form.baseSalary} onBaseSalaryChange={form.setBaseSalary}
                    />
                </View>

                <View style={s.sectionCard}>
                    <DetailSection
                        detailContent={form.detailContent}
                        onDetailContentChange={form.setDetailContent}
                        siteUrl={form.siteUrl}
                        onSiteUrlChange={form.setSiteUrl}
                    />
                </View>

                <View style={{ height: keyboardVisible ? 150 : 0 }} />

                <TouchableOpacity
                    style={s.submitBtn}
                    onPress={handleSubmit}
                    activeOpacity={0.85}
                >
                    <Text style={s.submitText}>공고 등록하기</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    nav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        paddingTop: 10,
        paddingBottom: 10,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    navBack: { width: 40, alignItems: 'flex-start' },
    navTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
    navSubRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingTop: 6,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    navPrevBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#eff6ff',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#bfdbfe',
    },
    navPrevText: { fontSize: 14, fontWeight: '700', color: '#3b82f6' },
    freebiesBadge: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    freebiesText: { fontSize: 12, fontWeight: '500', color: '#f59e0b' },
    scroll: { paddingHorizontal: 16, paddingVertical: 8, gap: 24 },
    // 평면형: 카드 그림자/배경 제거 (front처럼 여백으로만 구분)
    sectionCard: {},
    submitBtn: {
        backgroundColor: '#3b82f6',
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 4,
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    modalCard: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 24,
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 12,
    },
    modalIconWrap: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#fef2f2',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 10,
        textAlign: 'center',
    },
    modalDesc: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 28,
    },
    modalBtnRow: { flexDirection: 'row', gap: 10, width: '100%' },
    modalCancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
        alignItems: 'center',
    },
    modalCancelText: { fontSize: 15, fontWeight: '700', color: '#334155' },
    modalLeaveBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: '#ef4444',
        alignItems: 'center',
    },
    modalLeaveText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
