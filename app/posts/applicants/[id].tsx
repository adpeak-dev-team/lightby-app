import { useState, useCallback } from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet, Modal, Pressable, FlatList, Linking,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';

import { useGetPostApplicants } from '@/services/site/queries';
import { markApplyAsRead } from '@/services/site/api';
import { ApplicantProfile } from '@/services/site/types';
import { IMAGE_PREFIX } from '@/lib/constants';

// ─── 유틸 ─────────────────────────────────────────────────────────────────────
function calcAge(birthday: string): number {
  const birth = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function formatApplyDate(dateStr: string): string {
  const d = new Date(dateStr);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${m}/${day} 지원`;
}

function formatApplyDateFull(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 지원`;
}

function formatPhone(phone: string): string {
  const n = phone.replace(/\D/g, '');
  if (n.length === 11) return `${n.slice(0, 3)}-${n.slice(3, 7)}-${n.slice(7)}`;
  if (n.length === 10) return `${n.slice(0, 3)}-${n.slice(3, 6)}-${n.slice(6)}`;
  return phone;
}

function getProfileUri(thumbnail?: string | null): string | null {
  if (!thumbnail) return null;
  return thumbnail.startsWith('http') ? thumbnail : `${IMAGE_PREFIX}${thumbnail}`;
}

// ─── 성별 뱃지 ────────────────────────────────────────────────────────────────
function GenderBadge({ gender }: { gender?: string | null }) {
  if (!gender) return null;
  const isMale = gender === 'male' || gender === '남자' || gender === 'M';
  return (
    <View style={[s.genderBadge, isMale ? s.genderMale : s.genderFemale]}>
      <Text style={[s.genderText, isMale ? s.genderMaleText : s.genderFemaleText]}>
        {isMale ? '남성' : '여성'}
      </Text>
    </View>
  );
}

// ─── 스켈레톤 ────────────────────────────────────────────────────────────────
function SkeletonItem() {
  return (
    <View style={s.skeletonItem}>
      <View style={s.skeletonAvatar} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={s.skeletonLine} />
        <View style={[s.skeletonLine, { width: 60 }]} />
      </View>
    </View>
  );
}

// ─── 리스트 아이템 ────────────────────────────────────────────────────────────
function ApplicantListItem({
  applicant,
  onPress,
}: {
  applicant: ApplicantProfile;
  onPress: () => void;
}) {
  const age = applicant.birthday ? calcAge(applicant.birthday) : null;
  const profileUri = getProfileUri(applicant.profile_thumbnail);

  return (
    <TouchableOpacity style={s.listItem} onPress={onPress} activeOpacity={0.75}>
      {/* 프로필 이미지 */}
      <View style={s.avatarWrap}>
        {profileUri ? (
          <Image source={{ uri: profileUri }} style={s.avatar} contentFit="cover" />
        ) : (
          <Ionicons name="person-outline" size={26} color="#94a3b8" />
        )}
      </View>

      {/* 정보 */}
      <View style={{ flex: 1 }}>
        <View style={s.nameRow}>
          <Text style={s.nameText}>{applicant.name || applicant.nickname}</Text>
          {applicant.status === 'unread' && (
            <View style={s.newBadge}>
              <Text style={s.newBadgeText}>NEW</Text>
            </View>
          )}
        </View>
        <View style={s.metaRow}>
          <GenderBadge gender={applicant.gender} />
          {age !== null && <Text style={s.ageText}>{age}세</Text>}
        </View>
      </View>

      {/* 지원일 */}
      <Text style={s.dateText}>{formatApplyDate(applicant.created_at)}</Text>
    </TouchableOpacity>
  );
}

// ─── 이력서 모달 ──────────────────────────────────────────────────────────────
function ResumeModal({
  applicant,
  onClose,
}: {
  applicant: ApplicantProfile;
  onClose: () => void;
}) {
  const age = applicant.birthday ? calcAge(applicant.birthday) : null;
  const profileUri = getProfileUri(applicant.profile_thumbnail);
  const careers = applicant.careers?.filter(Boolean) ?? [];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose} />
      <View style={s.sheet}>
        {/* 닫기 버튼 */}
        <TouchableOpacity style={s.closeBtn} onPress={onClose} hitSlop={8}>
          <Ionicons name="close" size={20} color="#94a3b8" />
        </TouchableOpacity>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* 프로필 헤더 */}
          <View style={s.profileHeader}>
            <View style={s.profileAvatarWrap}>
              {profileUri ? (
                <Image source={{ uri: profileUri }} style={s.profileAvatar} contentFit="cover" />
              ) : (
                <Ionicons name="person-outline" size={44} color="#94a3b8" />
              )}
            </View>
            <View style={s.profileNameRow}>
              <Text style={s.profileName}>{applicant.name || applicant.nickname}</Text>
              {applicant.status === 'unread' && (
                <View style={s.newBadge}>
                  <Text style={s.newBadgeText}>NEW</Text>
                </View>
              )}
            </View>
            <View style={s.profileMetaRow}>
              <GenderBadge gender={applicant.gender} />
              {age !== null && <Text style={s.ageText}>{age}세</Text>}
            </View>

            {/* 전화번호 + 버튼 */}
            {applicant.phone && (
              <View style={s.phoneSection}>
                <View style={s.phoneBox}>
                  <Ionicons name="call-outline" size={16} color="#60a5fa" />
                  <Text style={s.phoneText}>{formatPhone(applicant.phone)}</Text>
                </View>
                <View style={s.contactBtns}>
                  <TouchableOpacity
                    style={[s.contactBtn, { backgroundColor: '#3b82f6' }]}
                    onPress={() => Linking.openURL(`tel:${applicant.phone}`)}
                  >
                    <Ionicons name="call" size={15} color="#fff" />
                    <Text style={s.contactBtnText}>전화하기</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.contactBtn, { backgroundColor: '#22c55e' }]}
                    onPress={() => Linking.openURL(`sms:${applicant.phone}`)}
                  >
                    <Ionicons name="chatbubble-outline" size={15} color="#fff" />
                    <Text style={s.contactBtnText}>문자하기</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          <View style={s.divider} />

          {/* 경력 */}
          {careers.length > 0 && (
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Ionicons name="briefcase-outline" size={15} color="#60a5fa" />
                <Text style={s.sectionLabel}>경력</Text>
              </View>
              {careers.map((career, i) => (
                <View key={i} style={s.careerItem}>
                  <View style={s.careerDot} />
                  <Text style={s.careerText}>{career}</Text>
                </View>
              ))}
            </View>
          )}

          {/* 자기소개 */}
          {applicant.introduction ? (
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Ionicons name="document-text-outline" size={15} color="#a78bfa" />
                <Text style={[s.sectionLabel, { color: '#7c3aed' }]}>자기소개</Text>
              </View>
              <View style={s.introBox}>
                <Text style={s.introText}>{applicant.introduction}</Text>
              </View>
            </View>
          ) : (
            careers.length === 0 && (
              <View style={s.emptyInfo}>
                <Ionicons name="person-outline" size={16} color="#cbd5e1" />
                <Text style={s.emptyInfoText}>추가 정보가 없습니다.</Text>
              </View>
            )
          )}

          {/* 지원일 */}
          <View style={s.applyDateRow}>
            <Ionicons name="mail-outline" size={14} color="#cbd5e1" />
            <Text style={s.applyDateText}>{formatApplyDateFull(applicant.created_at)}</Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────
export default function ApplicantsPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data, isLoading } = useGetPostApplicants(id);
  const [localList, setLocalList] = useState<ApplicantProfile[]>([]);
  const [selected, setSelected] = useState<ApplicantProfile | null>(null);

  const applicants = localList.length > 0 ? localList : (data?.items ?? []);

  const handleOpen = useCallback((applicant: ApplicantProfile) => {
    setSelected(applicant);
    if (applicant.status === 'unread') {
      markApplyAsRead(applicant.apply_id)
        .then(() => qc.invalidateQueries({ queryKey: ['my-job-postings'] }))
        .catch(() => null);
      const source = localList.length > 0 ? localList : (data?.items ?? []);
      setLocalList(source.map((a) =>
        a.apply_id === applicant.apply_id ? { ...a, status: 'read' as const } : a
      ));
      setSelected({ ...applicant, status: 'read' });
    }
  }, [localList, data?.items, qc]);

  return (
    <View style={s.container}>
      {/* 네비게이션 */}
      <View style={s.navbar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={s.navBtn}>
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={s.navTitle}>지원자 목록</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* 지원자 수 */}
      {!isLoading && applicants.length > 0 && (
        <Text style={s.countText}>
          총 <Text style={s.countNum}>{applicants.length}</Text>명 지원
        </Text>
      )}

      {/* 로딩 */}
      {isLoading && (
        <View style={s.skeletonList}>
          {[1, 2, 3].map((i) => <SkeletonItem key={i} />)}
        </View>
      )}

      {/* 리스트 */}
      {!isLoading && applicants.length > 0 && (
        <FlatList
          data={applicants}
          keyExtractor={(item) => String(item.apply_id)}
          renderItem={({ item }) => (
            <ApplicantListItem applicant={item} onPress={() => handleOpen(item)} />
          )}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* 비어있을 때 */}
      {!isLoading && applicants.length === 0 && (
        <View style={s.emptyState}>
          <Ionicons name="person-outline" size={48} color="#e2e8f0" />
          <Text style={s.emptyText}>아직 지원자가 없습니다.</Text>
        </View>
      )}

      {/* 이력서 모달 */}
      {selected && (
        <ResumeModal applicant={selected} onClose={() => setSelected(null)} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  // 네비게이션
  navbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 10,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  navBtn: { padding: 6 },
  navTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },

  countText: { fontSize: 12, fontWeight: '600', color: '#94a3b8', marginHorizontal: 16, marginTop: 14, marginBottom: 4 },
  countNum: { color: '#334155' },

  // 리스트
  listContent: { padding: 16, gap: 10 },
  listItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#f1f5f9',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  avatarWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', borderWidth: 2, borderColor: '#f1f5f9',
  },
  avatar: { width: '100%', height: '100%' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  nameText: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ageText: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
  dateText: { fontSize: 10, color: '#cbd5e1' },

  // NEW 뱃지
  newBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  newBadgeText: { fontSize: 10, fontWeight: '800', color: '#d97706' },

  // 성별 뱃지
  genderBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  genderMale: { backgroundColor: '#eff6ff' },
  genderFemale: { backgroundColor: '#fff1f2' },
  genderText: { fontSize: 11, fontWeight: '600' },
  genderMaleText: { color: '#3b82f6' },
  genderFemaleText: { color: '#f43f5e' },

  // 스켈레톤
  skeletonList: { padding: 16, gap: 10 },
  skeletonItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  skeletonAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#e2e8f0' },
  skeletonLine: { height: 14, backgroundColor: '#e2e8f0', borderRadius: 7, width: 80 },

  // 빈 상태
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyText: { fontSize: 14, fontWeight: '600', color: '#cbd5e1' },

  // 모달 시트
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  sheet: {
    position: 'absolute',
    left: 20, right: 20,
    top: '10%', bottom: '10%',
    backgroundColor: '#fff', borderRadius: 24,
    paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 12,
  },
  closeBtn: {
    position: 'absolute', top: 14, right: 14,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', zIndex: 1,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', alignSelf: 'center', marginBottom: 16 },

  // 프로필 헤더
  profileHeader: { alignItems: 'center', paddingBottom: 20 },
  profileAvatarWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', borderWidth: 2, borderColor: '#f1f5f9',
    marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6,
  },
  profileAvatar: { width: '100%', height: '100%' },
  profileNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  profileName: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  profileMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },

  // 전화번호
  phoneSection: { marginTop: 14, alignItems: 'center', gap: 10, width: '100%' },
  phoneBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe',
    borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10,
  },
  phoneText: { fontSize: 15, fontWeight: '700', color: '#3b82f6', letterSpacing: 1 },
  contactBtns: { flexDirection: 'row', gap: 8, width: '100%' },
  contactBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 11, borderRadius: 12,
  },
  contactBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  divider: { height: 1, backgroundColor: '#f1f5f9', marginBottom: 20 },

  // 섹션
  section: { marginBottom: 22 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#60a5fa', letterSpacing: 1, textTransform: 'uppercase' },

  // 경력
  careerItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  careerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#93c5fd', marginTop: 8 },
  careerText: { flex: 1, fontSize: 14, color: '#334155', lineHeight: 22 },

  // 자기소개
  introBox: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#f1f5f9' },
  introText: { fontSize: 14, color: '#475569', lineHeight: 22 },

  // 추가정보 없음
  emptyInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  emptyInfoText: { fontSize: 14, color: '#cbd5e1' },

  // 지원일
  applyDateRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  applyDateText: { fontSize: 13, color: '#94a3b8' },
});
