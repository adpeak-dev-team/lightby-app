import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Share, ActivityIndicator, Modal, Pressable,
  Linking, useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';

import { useGetJobDetail, useGetLikeStatus } from '@/services/site/queries';
import { incrementSiteView, applyToJob, toggleSiteLike } from '@/services/site/api';
import { useGetMe } from '@/services/auth/queries';
import { ICON_LIST, ICON_COLORS } from '@/lib/constants';
import { toast } from '@/hooks/use-toast';

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
      <View style={[s.sectionAccent, { backgroundColor: color }]} />
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
  success:   { icon: '🎉', title: '지원 완료!',       desc: '담당자가 확인 후 연락드릴 예정입니다.' },
  duplicate: { icon: '⚠️', title: '이미 지원한 공고', desc: '이미 지원하신 공고입니다.' },
  error:     { icon: '❌', title: '지원 실패',         desc: '잠시 후 다시 시도해 주세요.' },
};

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────
export default function SiteDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const qc = useQueryClient();

  const { data: job, isLoading } = useGetJobDetail(id);
  const { data: likeData, refetch: refetchLike } = useGetLikeStatus(job?.id);
  const { data: me } = useGetMe();

  const [currentImg, setCurrentImg]   = useState(0);
  const [applyState, setApplyState]   = useState<ApplyState>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const liked = likeData?.liked ?? false;

  // 조회수 증가
  useEffect(() => {
    if (id) incrementSiteView(id).catch(() => null);
  }, [id]);

  // 찜하기 뮤테이션
  const likeMutation = useMutation({
    mutationFn: () => toggleSiteLike(job!.id),
    onSuccess: () => refetchLike(),
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
        <ActivityIndicator size="large" color="#38bdf8" />
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
  const images = Array.isArray(job.imgs) && job.imgs.length > 0
    ? job.imgs.map(toImageUri)
    : [];
  const icons: number[] = (() => { try { return job.icons ? JSON.parse(job.icons) : []; } catch { return []; } })();
  const isOwner = !!me?.id && job.user_id === me.id;

  const fee        = job.fee ? `${job.fee_type || '직원'} ${job.fee.toLocaleString()}만원` : '-';
  const headcount  = job.number_people ? `${job.number_people}명` : '-';
  const industry   = Array.isArray(job.industries)    && job.industries.length > 0    ? job.industries.join(', ')    : '-';
  const position   = Array.isArray(job.job_categories) && job.job_categories.length > 0 ? job.job_categories.join(', ') : '-';

  const applyContent = applyState ? APPLY_CONTENT[applyState] : null;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* 네비게이션 */}
      <View style={s.navbar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={s.navBtn}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={s.navTitle}>구인 공고 상세</Text>
        <View style={s.navRight}>
          <TouchableOpacity onPress={handleLike} hitSlop={8} style={s.navBtn} disabled={likeMutation.isPending}>
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={22}
              color={liked ? '#ef4444' : '#111827'}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} hitSlop={8} style={s.navBtn}>
            <Ionicons name="share-outline" size={22} color="#111827" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── 이미지 갤러리 ── */}
        {images.length > 0 ? (
          <View>
            <ScrollView
              ref={scrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={(e) => setCurrentImg(Math.round(e.nativeEvent.contentOffset.x / width))}
              scrollEventThrottle={16}
            >
              {images.map((uri, i) => (
                <Image key={i} source={{ uri }} style={{ width, height: 240 }} contentFit="cover" />
              ))}
            </ScrollView>
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
            <Ionicons name="image-outline" size={48} color="#d1d5db" />
          </View>
        )}

        {/* ── 요약 섹션 ── */}
        <View style={s.summarySection}>
          {/* 소유자 삭제 버튼 */}
          {isOwner && (
            <TouchableOpacity style={s.deleteBtn} onPress={() => setShowDeleteModal(true)}>
              <Ionicons name="trash-outline" size={14} color="#fff" />
              <Text style={s.deleteBtnText}>삭제</Text>
            </TouchableOpacity>
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
          {!icons.length && !!job.agency && <Text style={[s.agencyText, { marginBottom: 4 }]}>{job.agency}</Text>}

          {/* 제목 */}
          <Text style={s.jobTitle}>{job.subject}</Text>

          {/* FIELD POINT */}
          {!!job.point_content && (
            <View style={s.fieldPointCard}>
              <Ionicons name="star" size={16} color="#fbbf24" />
              <View style={{ flex: 1 }}>
                <Text style={s.fieldPointLabel}>FIELD POINT</Text>
                <Text style={s.fieldPointText}>{job.point_content}</Text>
              </View>
            </View>
          )}
        </View>

        {/* ── 기본 정보 ── */}
        <View style={s.section}>
          {/* 수수료 + 모집인원 */}
          <View style={s.cardRow}>
            <View style={[s.card, s.cardHalf]}>
              <Text style={s.cardLabel}>수수료</Text>
              <Text style={[s.cardValue, { color: '#f97316' }]}>{fee}</Text>
            </View>
            <View style={[s.card, s.cardHalf]}>
              <Text style={s.cardLabel}>모집인원</Text>
              <Text style={s.cardValue}>{headcount}</Text>
            </View>
          </View>

          {/* 기본정보 테이블 */}
          <View style={s.card}>
            <SectionTitle label="기본정보" color="#3b82f6" />
            <View style={s.tableBody}>
              <InfoRow label="담당자" value={job.name || '-'} />
              <InfoRow label="업종"   value={industry} />
              <InfoRow label="직종"   value={position} />
              <InfoRow label="경력"   value={job.career_period || '-'} />
            </View>
          </View>

          {/* 영업지원 및 복지 */}
          <View style={s.card}>
            <SectionTitle label="영업지원 및 복지" color="#f97316" />
            <View style={s.welfareGrid}>
              {[
                { label: '일비',     value: job.daily_expense          || '-' },
                { label: '숙소비',   value: job.accommodation_expenses  || '-' },
                { label: '프로모션', value: job.promotion               || '-' },
                { label: '기본급',   value: job.base_pay                || '-' },
              ].map(({ label, value }) => (
                <View key={label} style={s.welfareItem}>
                  <Text style={s.welfareLabel}>{label}</Text>
                  <Text style={s.welfareValue}>{value}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ── 상세 모집내용 ── */}
        <View style={[s.section, { paddingTop: 0 }]}>
          <View style={s.card}>
            <SectionTitle label="상세 모집내용" color="#3b82f6" />
            <View style={s.detailContentBox}>
              <Text style={s.detailContentText}>{job.detail_content || '상세 내용이 없습니다.'}</Text>
            </View>
          </View>
        </View>

        {/* ── 근무지역 ── */}
        <View style={[s.section, { paddingTop: 0, paddingBottom: 16 }]}>
          <View style={s.card}>
            <SectionTitle label="근무지역" color="#f97316" />
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
              <Ionicons name="location-outline" size={15} color="#9ca3af" />
              <Text style={s.addressText}>{job.result_address || job.address || '-'}</Text>
            </View>
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
        <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#34d399' }]} onPress={handleSms}>
          <Ionicons name="chatbubble-outline" size={16} color="#fff" />
          <Text style={s.actionBtnText}>문자하기</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.actionBtn, { backgroundColor: '#f59e0b' }, applyMutation.isPending && s.actionBtnDisabled]}
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
            <TouchableOpacity style={s.modalBtnDanger} onPress={() => { /* TODO: delete API */ setShowDeleteModal(false); }}>
              <Text style={s.modalBtnDangerText}>삭제</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#f9fafb' },
  centered:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText:  { color: '#9ca3af', fontSize: 15 },
  scroll:     { flex: 1 },

  // 네비게이션
  navbar:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  navBtn:     { padding: 6 },
  navTitle:   { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: '#111827' },
  navRight:   { flexDirection: 'row', alignItems: 'center' },

  // 이미지
  noImage:    { height: 200, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  dots:       { flexDirection: 'row', justifyContent: 'center', gap: 5, paddingVertical: 8, backgroundColor: '#fff' },
  dot:        { width: 6, height: 6, borderRadius: 3, backgroundColor: '#e5e7eb' },
  dotActive:  { width: 16, backgroundColor: '#0ea5e9' },

  // 요약
  summarySection: { backgroundColor: '#fff', padding: 16, gap: 10 },
  deleteBtn:      { alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  deleteBtnText:  { color: '#fff', fontSize: 13, fontWeight: '700' },
  badgeRow:       { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  badge:          { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  badgeText:      { fontSize: 11, fontWeight: '700' },
  agencyText:     { fontSize: 14, color: '#6b7280' },
  jobTitle:       { fontSize: 22, fontWeight: '800', color: '#111827', lineHeight: 30 },
  fieldPointCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#eff6ff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#bfdbfe' },
  fieldPointLabel: { fontSize: 10, fontWeight: '800', color: '#3b82f6', letterSpacing: 1.5, marginBottom: 3 },
  fieldPointText:  { fontSize: 14, fontWeight: '700', color: '#1e3a5f' },

  // 섹션 / 카드
  section:     { padding: 12, gap: 10 },
  card:        { backgroundColor: '#fff', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#f3f4f6', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  cardRow:     { flexDirection: 'row', gap: 10 },
  cardHalf:    { flex: 1 },
  cardLabel:   { fontSize: 13, color: '#6b7280', marginBottom: 6 },
  cardValue:   { fontSize: 17, fontWeight: '800', color: '#111827' },

  // 섹션 제목
  sectionTitleRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionAccent:    { width: 3, height: 16, borderRadius: 2 },
  sectionTitleText: { fontSize: 15, fontWeight: '700', color: '#111827' },

  // 기본정보 테이블
  tableBody:   { gap: 0 },
  infoRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  infoLabel:   { fontSize: 14, color: '#6b7280' },
  infoValue:   { fontSize: 14, fontWeight: '600', color: '#111827', textAlign: 'right', flex: 1, marginLeft: 12 },

  // 복지 그리드
  welfareGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  welfareItem:  { width: '47%', backgroundColor: '#f9fafb', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#f3f4f6' },
  welfareLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  welfareValue: { fontSize: 14, fontWeight: '600', color: '#111827' },

  // 상세 내용
  detailContentBox:  { backgroundColor: '#f9fafb', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#f3f4f6' },
  detailContentText: { fontSize: 14, color: '#374151', lineHeight: 22 },

  // 근무지역
  regionChips:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  regionChip:     { backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  regionChipText: { fontSize: 13, color: '#3b82f6', fontWeight: '600' },
  addressRow:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  addressText:    { fontSize: 13, color: '#6b7280', flex: 1 },

  // 하단 액션 바
  actionBar:     { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f3f4f6', shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 8 },
  actionBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 12, borderRadius: 12 },
  actionBtnDisabled: { opacity: 0.6 },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // 모달
  overlay:               { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  modal:                 { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40, alignItems: 'center' },
  modalIcon:             { fontSize: 48, marginBottom: 12 },
  modalTitle:            { fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: 6 },
  modalSub:              { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24, lineHeight: 21 },
  modalCloseBtn:         { width: '100%', paddingVertical: 14, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center' },
  modalCloseBtnText:     { fontSize: 15, fontWeight: '700', color: '#374151' },
  modalBtns:             { flexDirection: 'row', gap: 10, width: '100%' },
  modalBtnSecondary:     { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center' },
  modalBtnSecondaryText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  modalBtnDanger:        { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#ef4444', alignItems: 'center' },
  modalBtnDangerText:    { fontSize: 14, fontWeight: '700', color: '#fff' },
});
