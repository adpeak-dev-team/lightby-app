import { useState, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import { apiClient } from '@/api/apiClient';
import { getJobDetail, copyImages } from './api';
import { useCreateJobPost } from './mutations';
import { MyPostSummary } from './types';
import { useGetUserProfile } from '@/services/user/queries';
import { ProductType } from '@/components/site-post/ProductSelectModal';

export function useSitePostForm() {
    // ── 폼 상태 ──
    const [subject, setSubject] = useState('');
    const [intro, setIntro] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [address, setAddress] = useState('');
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [workRegions, setWorkRegions] = useState('');
    const [agency, setAgency] = useState('');
    const [managerName, setManagerName] = useState('');
    const [managerPhone, setManagerPhone] = useState('');
    const [workIndustry, setWorkIndustry] = useState<string[]>([]);
    const [workOccupation, setWorkOccupation] = useState<string[]>([]);
    const [careerPeriod, setCareerPeriod] = useState('');
    const [headCount, setHeadCount] = useState('');
    const [feeType, setFeeType] = useState('');
    const [fee, setFee] = useState('');
    const [dailyPay, setDailyPay] = useState('');
    const [accommodationPay, setAccommodationPay] = useState('');
    const [promotion, setPromotion] = useState('');
    const [baseSalary, setBaseSalary] = useState('');
    const [detailContent, setDetailContent] = useState('');

    // ── API ──
    const { data: userProfile } = useGetUserProfile();
    const createMutation = useCreateJobPost();
    const [isLoadingPrev, setIsLoadingPrev] = useState(false);

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
    const loadPreviousPost = async (post: MyPostSummary) => {
        setIsLoadingPrev(true);
        try {
            const d = await getJobDetail(String(post.id));
            const originalImgs: string[] = Array.isArray(d.imgs)
                ? d.imgs
                : JSON.parse((d.imgs as any) || '[]');
            const copiedImgs = originalImgs.length > 0 ? await copyImages(originalImgs) : [];

            setSubject(d.subject ?? '');
            setIntro(d.point_content ?? '');
            setImages(copiedImgs);
            setAddress(d.address ?? '');
            setLatitude(typeof d.latitude === 'number' ? d.latitude : null);
            setLongitude(typeof d.longitude === 'number' ? d.longitude : null);
            setWorkRegions(Array.isArray(d.regions) ? (d.regions[0] ?? '') : '');
            setAgency(d.agency ?? '');
            setManagerName(d.name ?? '');
            setManagerPhone(d.phone ?? '');
            setWorkIndustry(d.industries ?? []);
            setWorkOccupation(d.job_categories ?? []);
            setCareerPeriod(d.career_period ?? '');
            setHeadCount(d.number_people ?? '');
            setFeeType(d.fee_type ?? '');
            setFee(d.fee ? String(d.fee) : '');
            setDailyPay(d.daily_expense ?? '');
            setAccommodationPay(d.accommodation_expenses ?? '');
            setPromotion(d.promotion ?? '');
            setBaseSalary(d.base_pay ?? '');
            setDetailContent(d.detail_content ?? '');
        } catch {
            Alert.alert('오류', '공고를 불러오는 중 오류가 발생했습니다.');
        } finally {
            setIsLoadingPrev(false);
        }
    };

    // ── 유효성 검사 ──
    const validate = (): string | null => {
        if (!subject.trim())          return '공고 제목을 입력해주세요.';
        if (!workRegions)             return '근무 지역을 선택해주세요.';
        if (!agency.trim())           return '분양대행사를 입력해주세요.';
        if (!managerName.trim())      return '담당자 성함을 입력해주세요.';
        if (!managerPhone.trim())     return '연락처를 입력해주세요.';
        if (workIndustry.length === 0) return '업종을 선택해주세요.';
        if (workOccupation.length === 0) return '직종을 선택해주세요.';
        if (!feeType)                 return '수수료 타입을 선택해주세요.';
        if (!fee.trim())              return '수수료 금액을 입력해주세요.';
        return null;
    };

    // ── 상품 선택 후 등록 ──
    const confirmProduct = (
        selectedProduct: ProductType,
        selectedIcons: number[],
        totalAmount: number,
        callbacks: { onSuccess: () => void; onCloseModal: () => void },
    ) => {
        createMutation.mutate(
            {
                subject, intro, images,
                address, resultAddress: address,
                latitude, longitude,
                workRegions: workRegions ? [workRegions] : [],
                agency, managerName, managerPhone,
                workIndustry, workOccupation,
                careerPeriod, headCount,
                feeType, fee,
                dailyPay, accommodationPay, promotion, baseSalary,
                detailContent,
                selectedProduct,
                selectedIcons,
                totalAmount,
            },
            {
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
                onError: () => Alert.alert('오류', '공고 등록 중 오류가 발생했습니다.'),
            },
        );
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
        latitude, setLatitude,
        longitude, setLongitude,
        workRegions, setWorkRegions,
        agency, setAgency,
        managerName, setManagerName,
        managerPhone, setManagerPhone,
        workIndustry, setWorkIndustry,
        workOccupation, setWorkOccupation,
        careerPeriod, setCareerPeriod,
        headCount, setHeadCount,
        feeType, setFeeType,
        fee, setFee,
        dailyPay, setDailyPay,
        accommodationPay, setAccommodationPay,
        promotion, setPromotion,
        baseSalary, setBaseSalary,
        detailContent, setDetailContent,
        // 유저/API
        userProfile,
        isLoadingPrev,
        isSubmitting: createMutation.isPending,
        isSuccessRef,
        imagesRef,
        // 핸들러
        toggleMulti,
        loadPreviousPost,
        validate,
        confirmProduct,
        deleteUploadedImages,
    };
}
