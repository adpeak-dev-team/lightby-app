import { useState, useEffect, useRef } from 'react';
import { Keyboard } from 'react-native';
import {
    View, Text, ScrollView, TouchableOpacity,
    StyleSheet, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@/api/apiClient';
import { useCreateJobPost } from '@/services/site/mutations';
import { useGetUserProfile } from '@/services/user/queries';

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
    const createMutation = useCreateJobPost();

    const { data: userProfile } = useGetUserProfile();
    useEffect(() => {
        if (userProfile) console.log('[UserProfile]', userProfile);
    }, [userProfile]);

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

    const [keyboardVisible, setKeyboardVisible] = useState(false);

    // ── 나가기 확인 모달 ──
    const imagesRef = useRef<string[]>([]);
    useEffect(() => { imagesRef.current = images; }, [images]);

    const [leaveModalVisible, setLeaveModalVisible] = useState(false);
    const [isDeletingImages, setIsDeletingImages] = useState(false);
    const pendingActionRef = useRef<any>(null);

    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
            const hasContent =
                subject || intro || imagesRef.current.length > 0 || address ||
                workRegions || agency || managerName || managerPhone ||
                workIndustry.length > 0 || workOccupation.length > 0 ||
                feeType || fee || detailContent;

            if (!hasContent) return;

            e.preventDefault();
            pendingActionRef.current = e.data.action;
            setLeaveModalVisible(true);
        });
        return unsubscribe;
    }, [navigation, subject, intro, address, workRegions, agency, managerName,
        managerPhone, workIndustry, workOccupation, feeType, fee, detailContent]);

    const handleConfirmLeave = async () => {
        setIsDeletingImages(true);
        if (imagesRef.current.length > 0) {
            await Promise.allSettled(
                imagesRef.current.map((path) =>
                    apiClient.delete('/internal/image-work', { data: { imagePath: path } }),
                ),
            );
        }
        setIsDeletingImages(false);
        setLeaveModalVisible(false);
        if (pendingActionRef.current) {
            navigation.dispatch(pendingActionRef.current);
        }
    };

    useEffect(() => {
        const show = Keyboard.addListener('keyboardDidShow', () => {
            setKeyboardVisible(true);
            console.log('[Keyboard] ON');
        });
        const hide = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardVisible(false);
            console.log('[Keyboard] OFF');
        });
        return () => { show.remove(); hide.remove(); };
    }, []);

    const toggleMulti = (
        setter: React.Dispatch<React.SetStateAction<string[]>>,
        value: string,
    ) => {
        setter((prev) =>
            prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
        );
    };

    const handleSubmit = () => {
        if (!subject.trim()) return Alert.alert('필수 입력', '공고 제목을 입력해주세요.');
        if (!workRegions) return Alert.alert('필수 입력', '근무 지역을 선택해주세요.');
        if (!agency.trim()) return Alert.alert('필수 입력', '분양대행사를 입력해주세요.');
        if (!managerName.trim()) return Alert.alert('필수 입력', '담당자 성함을 입력해주세요.');
        if (!managerPhone.trim()) return Alert.alert('필수 입력', '연락처를 입력해주세요.');
        if (workIndustry.length === 0) return Alert.alert('필수 입력', '업종을 선택해주세요.');
        if (workOccupation.length === 0) return Alert.alert('필수 입력', '직종을 선택해주세요.');
        if (!feeType) return Alert.alert('필수 입력', '수수료 타입을 선택해주세요.');
        if (!fee.trim()) return Alert.alert('필수 입력', '수수료 금액을 입력해주세요.');

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
                selectedProduct: 'FREE',
                selectedIcons: [],
                totalAmount: 0,
            },
            {
                onSuccess: (res) => {
                    if (res.success) {
                        Alert.alert('등록 완료', '공고가 등록되었습니다.', [
                            { text: '확인', onPress: () => router.back() },
                        ]);
                    } else {
                        Alert.alert('오류', res.message ?? '등록에 실패했습니다.');
                    }
                },
                onError: () => Alert.alert('오류', '공고 등록 중 오류가 발생했습니다.'),
            },
        );
    };

    return (
        <View style={s.container}>
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
                        <Text style={s.modalTitle}>작성을 그만두시겠어요?</Text>
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
            <View style={[s.nav, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.navBack}>
                    <Ionicons name="chevron-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={s.navTitle}>구인 공고 등록</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 30 }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <ImageSection images={images} onChange={setImages} />

                <PostInfoSection
                    subject={subject} onSubjectChange={setSubject}
                    intro={intro} onIntroChange={setIntro}
                />

                <RegionSection
                    address={address}
                    latitude={latitude}
                    longitude={longitude}
                    onAddressSelect={(addr, lat, lng) => {
                        console.log('여기로 오는거야??');
                        setAddress(addr);
                        setLatitude(lat);
                        setLongitude(lng);
                    }}
                    workRegions={workRegions}
                    onRegionSelect={setWorkRegions}
                />

                <AgencySection
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
                    careerPeriod={careerPeriod} onCareerPeriodChange={setCareerPeriod}
                    headCount={headCount} onHeadCountChange={setHeadCount}
                />

                <SalarySection
                    feeType={feeType} onFeeTypeSelect={setFeeType}
                    fee={fee} onFeeChange={setFee}
                    dailyPay={dailyPay} onDailyPayChange={setDailyPay}
                    accommodationPay={accommodationPay} onAccommodationPayChange={setAccommodationPay}
                    promotion={promotion} onPromotionChange={setPromotion}
                    baseSalary={baseSalary} onBaseSalaryChange={setBaseSalary}
                />

                <DetailSection
                    detailContent={detailContent}
                    onDetailContentChange={setDetailContent}
                />

                <View style={{ height: keyboardVisible ? 150 : 0 }} />

                <TouchableOpacity
                    style={[s.submitBtn, createMutation.isPending && s.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={createMutation.isPending}
                    activeOpacity={0.85}
                >
                    {createMutation.isPending
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={s.submitText}>공고 등록하기</Text>}
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f3f4f6' },
    nav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        paddingBottom: 10,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    navBack: { width: 40, alignItems: 'flex-start' },
    navTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
    scroll: { padding: 16, gap: 12 },
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
    submitText: { color: '#fff', fontSize: 16, fontWeight: '800' },
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
        fontWeight: '800',
        color: '#111827',
        marginBottom: 10,
        textAlign: 'center',
    },
    modalDesc: {
        fontSize: 14,
        color: '#6b7280',
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
        borderColor: '#e5e7eb',
        backgroundColor: '#f9fafb',
        alignItems: 'center',
    },
    modalCancelText: { fontSize: 15, fontWeight: '700', color: '#374151' },
    modalLeaveBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: '#ef4444',
        alignItems: 'center',
    },
    modalLeaveText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
