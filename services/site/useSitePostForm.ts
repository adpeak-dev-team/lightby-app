import { useState, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/apiClient';
import { getJobDetail, JobPostingPayload } from './api';
import { useCreateJobPost, invalidateJobLists } from './mutations';
import { MyPostSummary, FeeItem } from './types';
import { useGetUserProfile } from '@/services/user/queries';
import { ProductType } from '@/components/site-post/ProductSelectModal';
import { requestPayapp } from '@/services/payapp/api';

const EMPTY_FEE_ITEM: FeeItem = { category: '', amount: '' };

// 위경도 값을 안전하게 숫자로 변환. 변환 불가(null/빈문자/NaN)면 null.
const toCoord = (v: unknown): number | null => {
    const n = Number(v);
    return v === null || v === undefined || v === '' || Number.isNaN(n) ? null : n;
};

export function useSitePostForm() {
    // ── 폼 상태 ──
    const [subject, setSubject] = useState('');
    const [intro, setIntro] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [address, setAddress] = useState('');
    const [addressDetail, setAddressDetail] = useState('');
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

    // ── API ──
    const { data: userProfile } = useGetUserProfile();
    const qc = useQueryClient();
    const createMutation = useCreateJobPost();
    const [isLoadingPrev, setIsLoadingPrev] = useState(false);
    const [isPayappLoading, setIsPayappLoading] = useState(false);

    // 담당자 성함/연락처를 내 프로필에서 자동 입력 (사용자가 이미 입력했으면 유지)
    // ⚠️ 미인증(OAuth) 사용자의 phone 은 'notauth_...' placeholder라 그대로 채우면
    //    결제 시 PayApp에 쓰레기 번호가 나가 거절된다 → 휴대폰 형식일 때만 자동 입력.
    useEffect(() => {
        if (!userProfile) return;
        setManagerName((prev) => prev || userProfile.name || userProfile.nickname || '');
        const profilePhone = userProfile.phone ?? '';
        const isRealPhone = !profilePhone.startsWith('notauth_') && /^0\d{7,}$/.test(profilePhone.replace(/[^0-9]/g, ''));
        setManagerPhone((prev) => prev || (isRealPhone ? profilePhone : ''));
    }, [userProfile]);

    // ── 나가기/성공 플래그 ──
    const isSuccessRef = useRef(false);
    const imagesRef = useRef<string[]>([]);
    useEffect(() => { imagesRef.current = images; }, [images]);

    // ── 멀티 선택 토글 ──
    const toggleMulti = (
        setter: React.Dispatch<React.SetStateAction<string[]>>,
        value: string,
    ) => {
        setter((prev) =>
            prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
        );
    };

    // ── 이전 공고 불러오기 ──
    // 이미지/썸네일은 의도적으로 가져오지 않는다 — 매물이 다를 가능성이 크고, 사용자가 새 이미지 업로드하도록 유도.
    const loadPreviousPost = async (post: MyPostSummary) => {
        setIsLoadingPrev(true);
        try {
            const d = await getJobDetail(String(post.id));

            setSubject(d.subject ?? '');
            setIntro(d.point_content ?? '');
            setImages([]);
            setAddress(d.address ?? '');
            setAddressDetail(d.address_detail ?? '');
            // DB의 위경도(DECIMAL)는 드라이버가 문자열("37.123")로 반환하므로 숫자로 변환.
            // typeof 'number' 검사만 하면 문자열이 전부 null이 되어 등록 시 400(@IsNumber 실패)이 난다.
            setLatitude(toCoord(d.latitude));
            setLongitude(toCoord(d.longitude));
            setWorkRegions(Array.isArray(d.regions) ? (d.regions[0] ?? '') : '');
            setEnforcement(d.enforcement ?? '');
            setConstruction(d.construction ?? '');
            setAgency(d.agency ?? '');
            setManagerName(d.name ?? '');
            setManagerPhone(d.phone ?? '');
            setWorkIndustry(d.industries ?? []);
            setWorkOccupation(d.job_categories ?? []);
            setRequireGender(d.require_gender ?? '');
            setRequireAge(d.require_age ?? '');
            setCareerPeriod(d.career_period ?? '');
            setHeadCount(d.number_people ?? '');
            setFeeType(d.fee_type ?? '');
            setFee(Array.isArray(d.fee) && d.fee.length > 0 ? d.fee : [{ ...EMPTY_FEE_ITEM }]);
            setMealExpense(d.meal_expense ?? '');
            setTransportExpense(d.transport_expense ?? '');
            setHousing(d.housing ?? '');
            setAccommodationExpenses(d.accommodation_expenses ?? '');
            setDailyExpense(d.daily_expense ?? '');
            setBusinessExpense(d.business_expense ?? '');
            setPromotion(d.promotion ?? '');
            setBaseSalary(d.base_pay ?? '');
            setDetailContent(d.detail_content ?? '');
            setSiteUrl(d.site_url ?? '');
        } catch {
            Alert.alert('오류', '공고를 불러오는 중 오류가 발생했습니다.');
        } finally {
            setIsLoadingPrev(false);
        }
    };

    // ── 유효성 검사 ──
    const validate = (): string | null => {
        if (images.length === 0)      return '이미지를 1장 이상 등록해주세요.';
        if (!subject.trim())          return '공고 제목을 입력해주세요.';
        if (!workRegions)             return '근무 지역을 선택해주세요.';
        if (!agency.trim())           return '분양대행사를 입력해주세요.';
        if (!managerName.trim())      return '담당자 성함을 입력해주세요.';
        if (!managerPhone.trim())     return '연락처를 입력해주세요.';
        if (workIndustry.length === 0) return '업종을 선택해주세요.';
        if (workOccupation.length === 0) return '직종을 선택해주세요.';
        // 좌표 누락 가드: 백엔드가 latitude/longitude를 필수 number로 받으므로(@IsNumber),
        // null이면 등록 시 불투명한 400이 난다. 제출 전에 친절히 안내한다.
        if (typeof latitude !== 'number' || typeof longitude !== 'number')
            return '지도에서 위치를 확인할 수 없습니다. 주소를 다시 검색해주세요.';
        if (!feeType)                 return '수수료 형태를 선택해주세요.';
        // 수수료 항목은 '계약 수수료' / '기본급 + 수수료'일 때만 필수 (front 기준)
        const showFee = feeType === '계약 수수료' || feeType === '기본급 + 수수료';
        if (showFee) {
            const validFee = fee.filter(f => f.category.trim() || f.amount.trim());
            if (validFee.length === 0) return '수수료 금액을 입력해주세요.';
        }
        return null;
    };

    // 폼 → 서버 payload
    const buildPayload = (
        selectedProduct: ProductType,
        selectedIcons: number[],
        totalAmount: number,
    ): JobPostingPayload => {
        const cleanedFee = fee.filter(f => f.category.trim() || f.amount.trim());
        const resultAddress = addressDetail ? `${address} ${addressDetail}`.trim() : address;
        return {
            subject, intro, images,
            address, addressDetail, resultAddress,
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
            selectedProduct,
            selectedIcons,
            totalAmount,
        };
    };

    // ── 상품 선택 후 등록 ──
    // - FREE: 곧바로 createJobPost (기존 흐름)
    // - PREMIUM/TOP: PayApp 결제 요청 → payurl/orderId 를 호출부로 전달 (호출부가 WebView 오픈).
    //   결제 확정은 백엔드 웹훅이 처리 → 앱은 폴링 결과가 paid일 때 성공 처리만 하면 된다.
    const confirmProduct = async (
        selectedProduct: ProductType,
        selectedIcons: number[],
        totalAmount: number,
        callbacks: {
            onCloseModal: () => void;
            onSuccess: () => void;
            onPayappRequired?: (payurl: string, orderId: string) => void;
        },
    ) => {
        const payload = buildPayload(selectedProduct, selectedIcons, totalAmount);

        // 무료(FREE) 또는 프리미엄 첫 회 무료 혜택으로 totalAmount가 0인 경우 → 바로 등록
        const isFreeFlow = selectedProduct === 'FREE' || totalAmount === 0;

        if (isFreeFlow) {
            createMutation.mutate(payload, {
                onSuccess: (res) => {
                    if (res.success) {
                        isSuccessRef.current = true;
                        callbacks.onCloseModal();
                        Alert.alert('등록 완료', '공고가 등록되었습니다.', [
                            { text: '확인', onPress: callbacks.onSuccess },
                        ]);
                    } else {
                        Alert.alert('오류', res.message ?? '등록에 실패했습니다.');
                    }
                },
                // 서버가 보낸 사유(결제 정보 누락, 무료 혜택 소진 등)를 그대로 보여준다.
                // 통짜 문구로 덮으면 사용자도 제보도 원인을 알 수 없다.
                onError: (err: any) => Alert.alert(
                    '오류',
                    err?.response?.data?.message ?? '공고 등록 중 오류가 발생했습니다.',
                ),
            });
            return;
        }

        // 유료 상품 → PayApp 결제 요청
        setIsPayappLoading(true);
        try {
            const { payurl, orderId } = await requestPayapp(payload);
            callbacks.onCloseModal();
            callbacks.onPayappRequired?.(payurl, orderId);
        } catch (e: any) {
            Alert.alert('결제 요청 실패', e?.response?.data?.message ?? e?.message ?? '결제 요청 중 오류가 발생했습니다.');
        } finally {
            setIsPayappLoading(false);
        }
    };

    // PayApp 결제 확정 후 호출 — 서버 웹훅이 이미 공고를 만들었으므로 성공 처리만.
    // 단, 이 경로는 createMutation을 타지 않으므로 목록 캐시 무효화를 직접 해줘야
    // 결제로 등록한 공고가 메인에 바로 뜬다.
    const finalizeAfterPayapp = (onSuccess: () => void) => {
        invalidateJobLists(qc);
        isSuccessRef.current = true;
        Alert.alert('결제 완료', '결제 및 공고 등록이 완료되었습니다.', [
            { text: '확인', onPress: onSuccess },
        ]);
    };

    // ── 나가기 시 업로드 이미지 삭제 ──
    const deleteUploadedImages = async () => {
        if (imagesRef.current.length > 0) {
            await Promise.allSettled(
                imagesRef.current.map((path) =>
                    apiClient.delete('/internal/image-work', { data: { imagePath: path } }),
                ),
            );
        }
    };

    return {
        // 폼 필드
        subject, setSubject,
        intro, setIntro,
        images, setImages,
        address, setAddress,
        addressDetail, setAddressDetail,
        latitude, setLatitude,
        longitude, setLongitude,
        workRegions, setWorkRegions,
        enforcement, setEnforcement,
        construction, setConstruction,
        agency, setAgency,
        managerName, setManagerName,
        managerPhone, setManagerPhone,
        workIndustry, setWorkIndustry,
        workOccupation, setWorkOccupation,
        requireGender, setRequireGender,
        requireAge, setRequireAge,
        careerPeriod, setCareerPeriod,
        headCount, setHeadCount,
        feeType, setFeeType,
        fee, setFee,
        mealExpense, setMealExpense,
        transportExpense, setTransportExpense,
        housing, setHousing,
        accommodationExpenses, setAccommodationExpenses,
        dailyExpense, setDailyExpense,
        businessExpense, setBusinessExpense,
        promotion, setPromotion,
        baseSalary, setBaseSalary,
        detailContent, setDetailContent,
        siteUrl, setSiteUrl,
        // 유저/API
        userProfile,
        isLoadingPrev,
        isSubmitting: createMutation.isPending || isPayappLoading,
        isSuccessRef,
        imagesRef,
        // 핸들러
        toggleMulti,
        loadPreviousPost,
        validate,
        confirmProduct,
        finalizeAfterPayapp,
        deleteUploadedImages,
    };
}
