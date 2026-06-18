import { useState, useEffect, useRef } from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useGetJobDetail } from '@/services/site/queries';
import { useUpdateJobPost, useUpdateJobPostImages } from '@/services/site/mutations';
import { FeeItem } from '@/services/site/types';

const EMPTY_FEE_ITEM: FeeItem = { category: '', amount: '' };

import { ImageSection } from '@/components/site-post/ImageSection';
import { PostInfoSection } from '@/components/site-post/PostInfoSection';
import { RegionSection } from '@/components/site-post/RegionSection';
import { AgencySection } from '@/components/site-post/AgencySection';
import { IndustrySection } from '@/components/site-post/IndustrySection';
import { OccupationSection } from '@/components/site-post/OccupationSection';
import { SalarySection } from '@/components/site-post/SalarySection';
import { DetailSection } from '@/components/site-post/DetailSection';

function parseJsonArray(value: any): string[] {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
        try { return JSON.parse(value); } catch { return []; }
    }
    return [];
}

// 위경도 값을 안전하게 숫자로 변환. 변환 불가(null/빈문자/NaN)면 null.
// DB의 위경도(DECIMAL)는 드라이버가 문자열("37.123")로 반환하므로 그대로 두면 @IsNumber 검증에서 400이 난다.
function toCoord(v: unknown): number | null {
    const n = Number(v);
    return v === null || v === undefined || v === '' || Number.isNaN(n) ? null : n;
}

export default function SitePostEditPage() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const postId = parseInt(id);
    const router = useRouter();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();

    const { data: job, isLoading } = useGetJobDetail(id);
    const updateMutation = useUpdateJobPost();
    const updateImagesMutation = useUpdateJobPostImages();

    // ── 폼 상태 ──
    const [subject, setSubject] = useState('');
    const [intro, setIntro] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [address, setAddress] = useState('');
    const [addressDetail, setAddressDetail] = useState('');
    const [resultAddress, setResultAddress] = useState('');
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [workRegions, setWorkRegions] = useState('');
    const [enforcement, setEnforcement] = useState('');
    const [construction, setConstruction] = useState('');
    const [agency, setAgency] = useState('');
    const [managerName, setManagerName] = useState('');
    const [managerPhone, setManagerPhone] = useState('');
    const [workIndustry, setWorkIndustry] = useState<string[]>([]);
    const [workOccupation, setWorkOccupation] = useState<string[]>([]);
    const [requireGender, setRequireGender] = useState('');
    const [requireAge, setRequireAge] = useState('');
    const [careerPeriod, setCareerPeriod] = useState('');
    const [headCount, setHeadCount] = useState('');
    const [feeType, setFeeType] = useState('');
    const [fee, setFee] = useState<FeeItem[]>([{ ...EMPTY_FEE_ITEM }]);
    const [mealExpense, setMealExpense] = useState('');
    const [transportExpense, setTransportExpense] = useState('');
    const [housing, setHousing] = useState('');
    const [accommodationExpenses, setAccommodationExpenses] = useState('');
    const [dailyExpense, setDailyExpense] = useState('');
    const [businessExpense, setBusinessExpense] = useState('');
    const [promotion, setPromotion] = useState('');
    const [baseSalary, setBaseSalary] = useState('');
    const [detailContent, setDetailContent] = useState('');
    const [siteUrl, setSiteUrl] = useState('');

    const [isInitialized, setIsInitialized] = useState(false);
    const [leaveModalVisible, setLeaveModalVisible] = useState(false);
    const pendingActionRef = useRef<any>(null);

    // 기존 데이터로 폼 초기화
    useEffect(() => {
        if (job && !isInitialized) {
            const imgs = parseJsonArray(job.imgs);
            const regions = parseJsonArray(job.regions);
            const industries = parseJsonArray(job.industries);
            const jobCategories = parseJsonArray(job.job_categories);

            setSubject(job.subject ?? '');
            setIntro(job.point_content ?? '');
            setImages(imgs);
            setAddress(job.address ?? '');
            setAddressDetail(job.address_detail ?? '');
            setResultAddress(job.result_address ?? '');
            setLatitude(toCoord(job.latitude));
            setLongitude(toCoord(job.longitude));
            setWorkRegions(regions[0] ?? '');
            setEnforcement(job.enforcement ?? '');
            setConstruction(job.construction ?? '');
            setAgency(job.agency ?? '');
            setManagerName(job.name ?? '');
            setManagerPhone(job.phone ?? '');
            setWorkIndustry(industries);
            setWorkOccupation(jobCategories);
            setRequireGender(job.require_gender ?? '');
            setRequireAge(job.require_age ?? '');
            setCareerPeriod(job.career_period ?? '');
            setHeadCount(job.number_people ?? '');
            setFeeType(job.fee_type ?? '');
            setFee(Array.isArray(job.fee) && job.fee.length > 0 ? job.fee : [{ ...EMPTY_FEE_ITEM }]);
            setMealExpense(job.meal_expense ?? '');
            setTransportExpense(job.transport_expense ?? '');
            setHousing(job.housing ?? '');
            setAccommodationExpenses(job.accommodation_expenses ?? '');
            setDailyExpense(job.daily_expense ?? '');
            setBusinessExpense(job.business_expense ?? '');
            setPromotion(job.promotion ?? '');
            setBaseSalary(job.base_pay ?? '');
            setDetailContent(job.detail_content ?? '');
            setSiteUrl(job.site_url ?? '');
            setIsInitialized(true);
        }
    }, [job, isInitialized]);

    // 나가기 방지 (수정 중인 텍스트 필드 기준)
    useEffect(() => {
        if (!isInitialized) return;
        const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
            if (updateMutation.isSuccess) return;
            e.preventDefault();
            pendingActionRef.current = e.data.action;
            setLeaveModalVisible(true);
        });
        return unsubscribe;
    }, [navigation, isInitialized, updateMutation.isSuccess]);

    // ── 이미지 변경 시 즉시 DB 반영 ──
    const handleImagesChange = (newImages: string[]) => {
        setImages(newImages);
        updateImagesMutation.mutate({ id: postId, images: newImages });
    };

    const toggleMulti = (
        setter: React.Dispatch<React.SetStateAction<string[]>>,
        value: string,
    ) => {
        setter((prev) =>
            prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
        );
    };

    const handleSubmit = () => {
        if (images.length === 0) return Alert.alert('필수 입력', '이미지를 1장 이상 등록해주세요.');
        if (!subject.trim()) return Alert.alert('필수 입력', '공고 제목을 입력해주세요.');
        if (!workRegions) return Alert.alert('필수 입력', '근무 지역을 선택해주세요.');
        if (!agency.trim()) return Alert.alert('필수 입력', '분양대행사를 입력해주세요.');
        if (!managerName.trim()) return Alert.alert('필수 입력', '담당자 성함을 입력해주세요.');
        if (!managerPhone.trim()) return Alert.alert('필수 입력', '연락처를 입력해주세요.');
        if (workIndustry.length === 0) return Alert.alert('필수 입력', '업종을 선택해주세요.');
        if (workOccupation.length === 0) return Alert.alert('필수 입력', '직종을 선택해주세요.');
        if (!feeType) return Alert.alert('필수 입력', '수수료 형태를 선택해주세요.');
        const cleanedFee = fee.filter(f => f.category.trim() || f.amount.trim());
        // 수수료 항목은 '계약 수수료' / '기본급 + 수수료'일 때만 필수 (front 기준)
        const showFee = feeType === '계약 수수료' || feeType === '기본급 + 수수료';
        if (showFee && cleanedFee.length === 0) return Alert.alert('필수 입력', '수수료 금액을 입력해주세요.');

        const selectedIcons: number[] = (() => {
            try { return job?.icons ? JSON.parse(job.icons) : []; } catch { return []; }
        })();

        const combinedResultAddress = addressDetail ? `${address} ${addressDetail}`.trim() : resultAddress;
        updateMutation.mutate(
            {
                id: postId,
                payload: {
                    subject, intro, images,
                    address, addressDetail, resultAddress: combinedResultAddress,
                    latitude, longitude,
                    workRegions: workRegions ? [workRegions] : [],
                    enforcement, construction,
                    agency, managerName, managerPhone,
                    workIndustry, workOccupation,
                    requireGender, requireAge,
                    careerPeriod, headCount,
                    feeType, fee: cleanedFee,
                    mealExpense, transportExpense, housing, accommodationExpenses,
                    dailyExpense, businessExpense, promotion, baseSalary,
                    detailContent, siteUrl,
                    selectedProduct: job?.product ?? 'FREE',
                    selectedIcons,
                    totalAmount: 0,
                },
            },
            {
                onSuccess: (res) => {
                    if (res.success) {
                        Alert.alert('수정 완료', '공고가 수정되었습니다.', [
                            {
                                text: '확인',
                                onPress: () => router.replace(`/posts/site/${postId}` as never),
                            },
                        ]);
                    } else {
                        Alert.alert('오류', res.message ?? '수정에 실패했습니다.');
                    }
                },
                onError: () => Alert.alert('오류', '공고 수정 중 오류가 발생했습니다.'),
            },
        );
    };

    if (isLoading || !isInitialized) {
        return (
            <View style={s.centered}>
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    return (
        <View style={s.container}>
            {/* 나가기 확인 모달 */}
            <Modal
                visible={leaveModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setLeaveModalVisible(false)}
            >
                <View style={s.modalOverlay}>
                    <View style={s.modalCard}>
                        <View style={s.modalIconWrap}>
                            <Ionicons name="alert-circle" size={40} color="#f87171" />
                        </View>
                        <Text style={s.modalTitle}>수정을 그만두시겠어요?</Text>
                        <Text style={s.modalDesc}>
                            저장하지 않은 내용은 반영되지 않습니다.{'\n'}
                            (이미지 변경은 이미 저장되었습니다.)
                        </Text>
                        <View style={s.modalBtnRow}>
                            <TouchableOpacity
                                style={s.modalCancelBtn}
                                onPress={() => setLeaveModalVisible(false)}
                                activeOpacity={0.8}
                            >
                                <Text style={s.modalCancelText}>계속 수정</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={s.modalLeaveBtn}
                                onPress={() => {
                                    setLeaveModalVisible(false);
                                    if (pendingActionRef.current) {
                                        navigation.dispatch(pendingActionRef.current);
                                    }
                                }}
                                activeOpacity={0.8}
                            >
                                <Text style={s.modalLeaveText}>나가기</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* 네비게이션 헤더 */}
            <View style={s.nav}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.navBack}>
                    <Ionicons name="chevron-back" size={24} color="#0f172a" />
                </TouchableOpacity>
                <Text style={s.navTitle}>구인 공고 수정</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 30 }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* 이미지: 변경 즉시 DB 반영 */}
                <ImageSection images={images} onChange={handleImagesChange} />

                <PostInfoSection
                    subject={subject} onSubjectChange={setSubject}
                    intro={intro} onIntroChange={setIntro}
                />

                <RegionSection
                    address={address}
                    addressDetail={addressDetail}
                    onAddressDetailChange={setAddressDetail}
                    latitude={latitude}
                    longitude={longitude}
                    onAddressSelect={(addr, lat, lng) => {
                        setAddress(addr);
                        setResultAddress(addr);
                        setLatitude(lat);
                        setLongitude(lng);
                    }}
                    workRegions={workRegions}
                    onRegionSelect={setWorkRegions}
                />

                <AgencySection
                    enforcement={enforcement} onEnforcementChange={setEnforcement}
                    construction={construction} onConstructionChange={setConstruction}
                    agency={agency} onAgencyChange={setAgency}
                    managerName={managerName} onManagerNameChange={setManagerName}
                    managerPhone={managerPhone} onManagerPhoneChange={setManagerPhone}
                />

                <IndustrySection
                    workIndustry={workIndustry}
                    onToggle={(v) => toggleMulti(setWorkIndustry, v)}
                />

                <OccupationSection
                    workOccupation={workOccupation}
                    onToggle={(v) => toggleMulti(setWorkOccupation, v)}
                    requireGender={requireGender} onRequireGenderChange={setRequireGender}
                    requireAge={requireAge} onRequireAgeChange={setRequireAge}
                    careerPeriod={careerPeriod} onCareerPeriodChange={setCareerPeriod}
                    headCount={headCount} onHeadCountChange={setHeadCount}
                />

                <SalarySection
                    feeType={feeType} onFeeTypeSelect={setFeeType}
                    fee={fee} onFeeChange={setFee}
                    mealExpense={mealExpense} onMealExpenseChange={setMealExpense}
                    transportExpense={transportExpense} onTransportExpenseChange={setTransportExpense}
                    housing={housing} onHousingChange={setHousing}
                    accommodationExpenses={accommodationExpenses} onAccommodationExpensesChange={setAccommodationExpenses}
                    dailyExpense={dailyExpense} onDailyExpenseChange={setDailyExpense}
                    businessExpense={businessExpense} onBusinessExpenseChange={setBusinessExpense}
                    promotion={promotion} onPromotionChange={setPromotion}
                    baseSalary={baseSalary} onBaseSalaryChange={setBaseSalary}
                />

                <DetailSection
                    detailContent={detailContent}
                    onDetailContentChange={setDetailContent}
                    siteUrl={siteUrl}
                    onSiteUrlChange={setSiteUrl}
                />

                <TouchableOpacity
                    style={[s.submitBtn, updateMutation.isPending && s.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={updateMutation.isPending}
                    activeOpacity={0.85}
                >
                    {updateMutation.isPending
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={s.submitText}>수정 완료</Text>}
                </TouchableOpacity>

                {/* 이미지 저장 중 인디케이터 */}
                {updateImagesMutation.isPending && (
                    <View style={s.imageSavingBar}>
                        <ActivityIndicator size="small" color="#3b82f6" />
                        <Text style={s.imageSavingText}>이미지 저장 중...</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    nav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    navBack: { width: 40, alignItems: 'flex-start' },
    navTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },

    scroll: { paddingHorizontal: 16, paddingVertical: 8, gap: 24 },

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
    submitBtnDisabled: { opacity: 0.6 },
    submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },

    imageSavingBar: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 8, paddingVertical: 10,
    },
    imageSavingText: { fontSize: 13, color: '#64748b' },

    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32,
    },
    modalCard: {
        width: '100%', backgroundColor: '#fff', borderRadius: 24,
        paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24,
        alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15, shadowRadius: 24, elevation: 12,
    },
    modalIconWrap: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    },
    modalTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a', marginBottom: 10, textAlign: 'center' },
    modalDesc: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
    modalBtnRow: { flexDirection: 'row', gap: 10, width: '100%' },
    modalCancelBtn: {
        flex: 1, paddingVertical: 14, borderRadius: 14,
        borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', alignItems: 'center',
    },
    modalCancelText: { fontSize: 14, fontWeight: '700', color: '#334155' },
    modalLeaveBtn: {
        flex: 1, paddingVertical: 14, borderRadius: 14,
        backgroundColor: '#ef4444', alignItems: 'center',
    },
    modalLeaveText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
