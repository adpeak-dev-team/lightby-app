import { useCallback, useEffect, useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet, Share, ActivityIndicator, Modal, Pressable, Linking, useWindowDimensions, Image as RNImage,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { Image } from 'expo-image';
import Carousel from 'react-native-reanimated-carousel';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';

import { useGetJobDetail, useGetLikeStatus } from '@/services/site/queries';
import { incrementSiteView, applyToJob, toggleSiteLike, deleteJobPost } from '@/services/site/api';
import { useGetMe } from '@/services/auth/queries';
import { ICON_LIST, ICON_COLORS } from '@/lib/constants';
import { toast } from '@/hooks/use-toast';
import { KakaoMap } from '@/components/common/KakaoMap';

const IMAGE_PREFIX = process.env.EXPO_PUBLIC_IMAGE_PREFIX ?? '';

// ─── 유틸 ─────────────────────────────────────────────────────────────────────
function toImageUri(path: string): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${IMAGE_PREFIX}${path.replace(/\\/g, '/')}`;
}

// ─── 섹션 헤더 ────────────────────────────────────────────────────────────────
function SectionTitle({ label, color }: { label: string; color: string }) {
  return (
    <View style={s.sectionTitleRow}>
      <View style={[s.sectionDot, { backgroundColor: color }]} />
      <Text style={s.sectionTitleText}>{label}</Text>
    </View>
  );
}

// ─── 정보 행 ──────────────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

// ─── 지원 결과 모달 내용 ──────────────────────────────────────────────────────
type ApplyState = 'success' | 'duplicate' | 'error' | null;
const APPLY_CONTENT: Record<NonNullable<ApplyState>, { icon: string; title: string; desc: string }> = {
  success: { icon: '🎉', title: '지원 완료!', desc: '담당자가 확인 후 연락드릴 예정입니다.' },
  duplicate: { icon: '⚠️', title: '이미 지원한 공고', desc: '이미 지원하신 공고입니다.' },
  error: { icon: '❌', title: '지원 실패', desc: '잠시 후 다시 시도해 주세요.' },
};

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────
export default function SiteDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const qc = useQueryClient();

  const { data: job, isLoading } = useGetJobDetail(id);
  const { data: likeData, refetch: refetchLike } = useGetLikeStatus(job?.id);
  const { data: me } = useGetMe();

  const [currentImg, setCurrentImg] = useState(0);
  const [applyState, setApplyState] = useState<ApplyState>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sliderHeight, setSliderHeight] = useState(width * 0.75);

  useEffect(() => {
    if (!job?.imgs || !Array.isArray(job.imgs) || job.imgs.length === 0) return;
    const uris = job.imgs.map(toImageUri);
    let maxH = 0;
    let settled = 0;
    const total = uris.length;
    uris.forEach((uri) => {
      RNImage.getSize(
        uri,
        (w, h) => {
          const scaled = (h / w) * width;
          if (scaled > maxH) maxH = scaled;
          settled++;
          if (settled === total) setSliderHeight(Math.min(maxH, width * 1.5));
        },
        () => {
          settled++;
          if (settled === total && maxH > 0) setSliderHeight(Math.min(maxH, width * 1.5));
        },
      );
    });
  }, [job?.imgs, width]);

  const liked = likeData?.liked ?? false;

  // 조회수 증가
  useEffect(() => {
    if (id) incrementSiteView(id).catch(() => null);
  }, [id]);

  // 찜하기 뮤테이션 (옵티미스틱: 탭 즉시 반응, 실패 시 롤백)
  const likeMutation = useMutation({
    mutationFn: () => toggleSiteLike(job!.id),
    onMutate: async () => {
      const key = ['site-like', job!.id];
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<{ liked: boolean }>(key);
      qc.setQueryData(key, { liked: !(prev?.liked ?? false) });
      return { prev, key };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(ctx.key, ctx.prev);
    },
    onSuccess: () => {
      refetchLike();
      // 관심현장 "찜한 목록"이 즉시 반영되도록 무효화
      qc.invalidateQueries({ queryKey: ['favorite-sites'] });
    },
  });

  // 지원하기 뮤테이션
  const applyMutation = useMutation({
    mutationFn: () => applyToJob(job!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-applications'] }); setApplyState('success'); },
    onError: (err) => {
      const status = (err as AxiosError)?.response?.status;
      setApplyState(status === 409 ? 'duplicate' : 'error');
    },
  });

  // 삭제 뮤테이션
  const deleteMutation = useMutation({
    mutationFn: () => deleteJobPost(job!.id),
    onSuccess: () => {
      setShowDeleteModal(false);
      toast.success('삭제되었습니다.');
      // 삭제된 공고가 모든 목록에서 즉시 사라지도록 무효화
      qc.invalidateQueries({ queryKey: ['jobs'] });
      qc.invalidateQueries({ queryKey: ['jobs-free'] });
      qc.invalidateQueries({ queryKey: ['favorite-sites'] });
      qc.invalidateQueries({ queryKey: ['my-recent-posts'] });
      qc.invalidateQueries({ queryKey: ['my-job-postings'] }); // 지원자 관리
      qc.invalidateQueries({ queryKey: ['user-post-list'] });  // 내 글 관리
      qc.invalidateQueries({ queryKey: ['user-post-count'] });
      router.back();
    },
    onError: () => {
      setShowDeleteModal(false);
      toast.error('삭제에 실패했습니다.');
    },
  });

  const handleLike = useCallback(() => {
    if (!me) { toast.info('로그인이 필요한 서비스입니다.'); return; }
    likeMutation.mutate();
  }, [me, likeMutation]);

  const handleShare = useCallback(() => {
    Share.share({ message: `https://lightby.co.kr/posts/site/${id}` });
  }, [id]);

  const handleCall = useCallback(() => {
    if (job?.phone) Linking.openURL(`tel:${job.phone}`);
  }, [job?.phone]);

  const handleSms = useCallback(() => {
    if (job?.phone) Linking.openURL(`sms:${job.phone}`);
  }, [job?.phone]);

  const handleApply = useCallback(() => {
    if (!me) { toast.info('로그인이 필요한 서비스입니다.'); return; }
    applyMutation.mutate();
  }, [me, applyMutation]);

  // ── 로딩 / 에러 ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={[s.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#60a5fa" />
      </View>
    );
  }
  if (!job) {
    return (
      <View style={[s.centered, { paddingTop: insets.top }]}>
        <Text style={s.emptyText}>데이터를 불러올 수 없습니다.</Text>
      </View>
    );
  }

  // ── 데이터 파싱 ────────────────────────────────────────────────────────────
  const images: string[] = Array.isArray(job.imgs) && job.imgs.length > 0
    ? job.imgs.map(toImageUri)
    : [];

  const icons: number[] = (() => { try { return job.icons ? JSON.parse(job.icons) : []; } catch { return []; } })();
  const isOwner = !!me?.id && job.user_id === me.id;

  const feeItems = Array.isArray(job.fee) && job.fee.length > 0 ? job.fee.filter((f: any) => f.amount) : [];
  const headcount = job.number_people ? `${job.number_people}명` : '';
  const industry = Array.isArray(job.industries) && job.industries.length > 0 ? job.industries.join(', ') : '';
  const position = Array.isArray(job.job_categories) && job.job_categories.length > 0 ? job.job_categories.join(', ') : '';

  const applyContent = applyState ? APPLY_CONTENT[applyState] : null;

  return (
    <View style={[s.container]}>
      {/* 네비게이션 */}
      <View style={s.navbar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={s.navBtn}>
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={s.navTitle}>구인 공고 상세</Text>
        <View style={s.navRight}>
          <TouchableOpacity onPress={handleLike} hitSlop={8} style={s.navBtn} disabled={likeMutation.isPending}>
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={22}
              color={liked ? '#ef4444' : '#0f172a'}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} hitSlop={8} style={s.navBtn}>
            <Ionicons name="share-outline" size={22} color="#0f172a" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>

        {/* ── 이미지 갤러리 ── */}
        {images.length > 0 ? (
          <View>
            <Carousel
              width={width}
              height={sliderHeight}
              data={images}
              loop={images.length > 1}
              onSnapToItem={setCurrentImg}
              renderItem={({ item }) => (
                <Image
                  source={{ uri: item }}
                  style={{ width, height: sliderHeight, backgroundColor: '#f1f5f9' }}
                  contentFit="contain"
                />
              )}
            />
            {images.length > 1 && (
              <View style={s.dots}>
                {images.map((_, i) => (
                  <View key={i} style={[s.dot, i === currentImg && s.dotActive]} />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={[s.noImage, { width }]}>
            <Ionicons name="image-outline" size={48} color="#cbd5e1" />
          </View>
        )}

        {/* ── 요약 섹션 ── */}
        <View style={s.summarySection}>
          {/* 소유자 수정/삭제 버튼 */}
          {isOwner && (
            <View style={s.ownerBtns}>
              <TouchableOpacity
                style={s.editBtn}
                onPress={() => router.push({ pathname: '/registration/sitepost-edit/[id]', params: { id } } as never)}
              >
                <Ionicons name="pencil-outline" size={14} color="#fff" />
                <Text style={s.editBtnText}>수정</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.deleteBtn} onPress={() => setShowDeleteModal(true)}>
                <Ionicons name="trash-outline" size={14} color="#fff" />
                <Text style={s.deleteBtnText}>삭제</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 아이콘 뱃지 */}
          {icons.length > 0 && (
            <View style={s.badgeRow}>
              {icons.map((iconId) => {
                const icon = ICON_LIST.find((i) => i.id === iconId);
                if (!icon) return null;
                const c = ICON_COLORS[icon.color] ?? ICON_COLORS.blue;
                return (
                  <View key={iconId} style={[s.badge, { backgroundColor: c.bg, borderColor: c.border }]}>
                    <Text style={[s.badgeText, { color: c.text }]}>{icon.name}</Text>
                  </View>
                );
              })}
              {!!job.agency && <Text style={s.agencyText}>{job.agency}</Text>}
            </View>
          )}

          {/* 제목 + 포인트 */}
          <View style={s.titleBlock}>
            <Text style={s.jobTitle}>{job.subject}</Text>
            {!!job.point_content && (
              <Text style={s.pointText}>{job.point_content}</Text>
            )}
            <View style={s.titleAccentBar} />
          </View>
        </View>

        {/* ── 기본 정보 ── */}
        <View style={s.section}>
          {/* 급여정보 */}
          <View style={s.card}>
            <SectionTitle label="급여정보" color="#2563eb" />
            {!!job.base_pay && (
              <View style={s.salaryRow}>
                <Text style={s.salaryLabel}>기본급</Text>
                <Text style={s.salaryValue}>{job.base_pay} 만원</Text>
              </View>
            )}
            <Text style={s.feeTypeText}>{job.fee_type || '수수료'}</Text>
            {feeItems.length > 0 ? (
              feeItems.map((item: any, i: number) => (
                <View key={i} style={s.salaryRow}>
                  <Text style={s.salaryLabel}>{item.category || `항목 ${i + 1}`}</Text>
                  <Text style={s.salaryValue}>{item.amount}{String(item.amount).includes('%') ? '' : ' 만원'}</Text>
                </View>
              ))
            ) : (
              <View style={s.emptyFeeBox}>
                <Text style={s.emptyFeeText}>수수료 정보를 확인해 주세요.</Text>
              </View>
            )}
          </View>

          {/* 현장정보 */}
          <View style={s.card}>
            <SectionTitle label="현장정보" color="#94a3b8" />
            <View style={s.infoGrid}>
              {[
                { label: '시행사', value: job.enforcement },
                { label: '시공사', value: job.construction },
                { label: '대행사', value: job.agency },
                { label: '담당자', value: job.name },
                { label: '전화번호', value: job.phone },
              ].filter(({ value }) => !!value).map(({ label, value }) => (
                <View key={label} style={s.infoGridItem}>
                  <Text style={s.infoGridLabel}>{label}</Text>
                  <Text style={s.infoGridValue}>{value}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* 지원정보 */}
          <View style={s.card}>
            <SectionTitle label="지원정보" color="#94a3b8" />
            <View style={s.infoGrid}>
              {[
                { label: '업종', value: industry },
                { label: '직종', value: position },
                { label: '성별', value: job.require_gender },
                { label: '나이', value: job.require_age },
                { label: '경력', value: job.career_period },
                { label: '모집인원', value: headcount },
              ].filter(({ value }) => !!value).map(({ label, value }) => (
                <View key={label} style={s.infoGridItem}>
                  <Text style={s.infoGridLabel}>{label}</Text>
                  <Text style={s.infoGridValue}>{value}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* 영업지원 및 복지 */}
          {[job.meal_expense, job.transport_expense, job.housing, job.accommodation_expenses,
            job.daily_expense, job.business_expense, job.promotion].some(Boolean) && (
            <View style={s.card}>
              <SectionTitle label="영업지원 및 복지" color="#94a3b8" />
              <View style={s.welfareGrid}>
                {[
                  { label: '식사', value: job.meal_expense },
                  { label: '교통비', value: job.transport_expense },
                  { label: '숙소', value: job.housing },
                  { label: '숙소비', value: job.accommodation_expenses },
                  { label: '일비', value: job.daily_expense },
                  { label: '영업비', value: job.business_expense },
                ].filter(({ value }) => !!value).map(({ label, value }) => (
                  <View key={label} style={s.welfareItem}>
                    <Text style={s.welfareLabel}>{label}</Text>
                    <Text style={s.welfareValue}>{value}</Text>
                  </View>
                ))}
              </View>
              {!!job.promotion && (
                <View style={s.promotionBox}>
                  <Text style={s.promotionLabel}>프로모션</Text>
                  <Text style={s.promotionValue}>{job.promotion}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ── 근무지역 (front 순서: 상세 모집내용 앞) ── */}
        <View style={[s.section, { paddingTop: 0 }]}>
          <View style={s.card}>
            <SectionTitle label="근무지역" color="#94a3b8" />
            {Array.isArray(job.regions) && job.regions.length > 0 && (
              <View style={s.regionChips}>
                {job.regions.map((r, i) => (
                  <View key={i} style={s.regionChip}>
                    <Text style={s.regionChipText}>{r}</Text>
                  </View>
                ))}
              </View>
            )}
            <View style={s.addressRow}>
              <Ionicons name="location-outline" size={15} color="#94a3b8" />
              <Text style={s.addressText}>{job.result_address || job.address || '-'}</Text>
            </View>
            {job.latitude != null && job.longitude != null && (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => router.push({
                  pathname: '/map-view',
                  params: {
                    lat: String(job.latitude),
                    lng: String(job.longitude),
                    label: job.result_address || job.address || '',
                  },
                })}
              >
                <KakaoMap
                  latitude={job.latitude}
                  longitude={job.longitude}
                  label={job.result_address || job.address}
                  height={200}
                />
                <View style={s.mapHintBadge} pointerEvents="none">
                  <Ionicons name="expand-outline" size={12} color="#fff" />
                  <Text style={s.mapHintText}>크게 보기</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── 상세 모집내용 (front 순서: 근무지역 뒤) ── */}
        <View style={[s.section, { paddingTop: 0, paddingBottom: 16 }]}>
          <View style={s.card}>
            <SectionTitle label="상세 모집내용" color="#94a3b8" />
            <View style={s.detailContentBox}>
              <Text style={s.detailContentText}>{job.detail_content || '상세 내용이 없습니다.'}</Text>
            </View>
            {!!job.site_url && (
              <TouchableOpacity
                style={s.siteUrlBox}
                onPress={() => job.site_url && Linking.openURL(job.site_url)}
                activeOpacity={0.75}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.siteUrlLabel}>공식 사이트</Text>
                  <Text style={s.siteUrlText} numberOfLines={1}>{job.site_url}</Text>
                </View>
                <Ionicons name="open-outline" size={16} color="#60a5fa" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 하단 바 여백 */}
        <View style={{ height: 90 + insets.bottom }} />
      </ScrollView>

      {/* ── 하단 액션 바 ── */}
      <View style={[s.actionBar, { paddingBottom: insets.bottom || 12 }]}>
        <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#60a5fa' }]} onPress={handleCall}>
          <Ionicons name="call-outline" size={16} color="#fff" />
          <Text style={s.actionBtnText}>전화하기</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#22c55e' }]} onPress={handleSms}>
          <Ionicons name="chatbubble-outline" size={16} color="#fff" />
          <Text style={s.actionBtnText}>문자하기</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.actionBtn, { backgroundColor: '#eab308' }, applyMutation.isPending && s.actionBtnDisabled]}
          onPress={handleApply}
          disabled={applyMutation.isPending}
        >
          <Ionicons name="paper-plane-outline" size={16} color="#fff" />
          <Text style={s.actionBtnText}>{applyMutation.isPending ? '지원 중...' : '지원하기'}</Text>
        </TouchableOpacity>
      </View>

      {/* 지원 결과 모달 */}
      <Modal visible={!!applyContent} transparent animationType="fade" onRequestClose={() => setApplyState(null)}>
        <Pressable style={s.overlay} onPress={() => setApplyState(null)} />
        {applyContent && (
          <View style={s.modal}>
            <Text style={s.modalIcon}>{applyContent.icon}</Text>
            <Text style={s.modalTitle}>{applyContent.title}</Text>
            <Text style={s.modalSub}>{applyContent.desc}</Text>
            <TouchableOpacity style={s.modalCloseBtn} onPress={() => setApplyState(null)}>
              <Text style={s.modalCloseBtnText}>확인</Text>
            </TouchableOpacity>
          </View>
        )}
      </Modal>

      {/* 삭제 확인 모달 */}
      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <Pressable style={s.overlay} onPress={() => setShowDeleteModal(false)} />
        <View style={s.modal}>
          <Text style={s.modalIcon}>🗑️</Text>
          <Text style={s.modalTitle}>게시글 삭제</Text>
          <Text style={s.modalSub}>삭제 후에는 복구가 불가능합니다.</Text>
          <View style={s.modalBtns}>
            <TouchableOpacity style={s.modalBtnSecondary} onPress={() => setShowDeleteModal(false)}>
              <Text style={s.modalBtnSecondaryText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.modalBtnDanger}
              onPress={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              <Text style={s.modalBtnDangerText}>{deleteMutation.isPending ? '삭제 중...' : '삭제'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 15 },
  scroll: { flex: 1 },
  mapHintBadge: {
    position: 'absolute', top: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(17,24,39,0.78)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999,
  },
  mapHintText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // 네비게이션
  navbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  navBtn: { padding: 6 },
  navTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: '#0f172a' },
  navRight: { flexDirection: 'row', alignItems: 'center' },

  // 이미지
  noImage: { height: 200, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5, paddingVertical: 8, backgroundColor: '#fff' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#e2e8f0' },
  dotActive: { width: 16, backgroundColor: '#3b82f6' },

  // 요약
  summarySection: { backgroundColor: '#fff', padding: 16, gap: 10 },
  ownerBtns: { flexDirection: 'row', alignSelf: 'flex-end', gap: 8 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#60a5fa', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8 },
  editBtnText: { color: '#fff', fontSize: 14, fontWeight: '400' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f87171', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8 },
  deleteBtnText: { color: '#fff', fontSize: 14, fontWeight: '400' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, borderWidth: 1 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  agencyText: { fontSize: 14, color: '#64748b' },
  titleBlock: { gap: 8 },
  jobTitle: { fontSize: 30, fontWeight: '700', color: '#0f172a', lineHeight: 38 },
  pointText: { fontSize: 16, fontWeight: '400', color: '#64748b', lineHeight: 26 },
  titleAccentBar: { marginTop: 16, height: 4, width: 96, borderRadius: 999, backgroundColor: '#2563eb' },

  // 섹션 / 카드
  section: { paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  card: { paddingVertical: 16 }, // 평면형: front(rounded-2xl p-4)처럼 카드 배경/테두리/그림자 없이 흰 배경에 여백으로 구분 (가로 여백은 section에서 통일 관리)
  cardRow: { flexDirection: 'row', gap: 10 },
  cardHalf: { flex: 1 },
  cardLabel: { fontSize: 13, color: '#64748b', marginBottom: 6 },
  cardValue: { fontSize: 17, fontWeight: '700', color: '#0f172a' },

  // 섹션 제목 (front: 작은 원형 점 + 제목)
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionDot: { width: 6, height: 6, borderRadius: 3 },
  sectionTitleText: { fontSize: 16, fontWeight: '700', color: '#1e293b' },

  // 급여정보 (front: primary-50 배경 + primary-600 텍스트)
  salaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#eff6ff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 8 },
  salaryLabel: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  salaryValue: { fontSize: 16, fontWeight: '700', color: '#2563eb' },
  feeTypeText: { fontSize: 14, fontWeight: '500', color: '#475569', marginBottom: 12 },
  emptyFeeBox: { backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center' },
  emptyFeeText: { fontSize: 14, color: '#94a3b8' },

  // 현장정보 / 지원정보 그리드 (front: bg-slate-50 rounded-xl, 보더 없음)
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  infoGridItem: { flexGrow: 1, flexBasis: '47%', backgroundColor: '#f8fafc', borderRadius: 12, padding: 12 },
  infoGridLabel: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  infoGridValue: { fontSize: 14, fontWeight: '500', color: '#1e293b' },

  // 복지 그리드 (front: bg-slate-50 rounded-xl, 보더 없음)
  welfareGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  welfareItem: { flexGrow: 1, flexBasis: '47%', backgroundColor: '#f8fafc', borderRadius: 12, padding: 12 },
  welfareLabel: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  welfareValue: { fontSize: 14, fontWeight: '500', color: '#1e293b' },
  promotionBox: { backgroundColor: '#fffbeb', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#fef3c7' },
  promotionLabel: { fontSize: 12, fontWeight: '600', color: '#d97706', marginBottom: 4 },
  promotionValue: { fontSize: 14, fontWeight: '500', color: '#1e293b' },

  // 상세 내용 (front: bg-slate-50 rounded-xl, 보더 없음)
  detailContentBox: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 16 },
  detailContentText: { fontSize: 16, color: '#334155', lineHeight: 26 },
  siteUrlBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#eff6ff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: '#bfdbfe' },
  siteUrlLabel: { fontSize: 12, fontWeight: '500', color: '#60a5fa', marginBottom: 2 },
  siteUrlText: { fontSize: 14, color: '#1d4ed8', flex: 1 },

  // 기본정보 테이블 (하위 호환)
  tableBody: { gap: 0 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  infoLabel: { fontSize: 14, color: '#64748b' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#0f172a', textAlign: 'right', flex: 1, marginLeft: 12 },

  // 근무지역
  regionChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  regionChip: { backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  regionChipText: { fontSize: 14, color: '#2563eb', fontWeight: '500' },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  addressText: { fontSize: 16, color: '#475569', flex: 1 },

  // 하단 액션 바
  actionBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 12, borderRadius: 12 },
  actionBtnDisabled: { opacity: 0.6 },
  actionBtnText: { color: '#fff', fontWeight: '500', fontSize: 16 },

  // 모달
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  modal: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40, alignItems: 'center' },
  modalIcon: { fontSize: 48, marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  modalSub: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 24, lineHeight: 21 },
  modalCloseBtn: { width: '100%', paddingVertical: 14, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center' },
  modalCloseBtnText: { fontSize: 16, fontWeight: '500', color: '#334155' },
  modalBtns: { flexDirection: 'row', gap: 10, width: '100%' },
  modalBtnSecondary: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center' },
  modalBtnSecondaryText: { fontSize: 14, fontWeight: '600', color: '#334155' },
  modalBtnDanger: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#ef4444', alignItems: 'center' },
  modalBtnDangerText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
