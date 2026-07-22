import { useState, useEffect, useRef } from 'react';
import {
  View, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator, Modal, KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { BottomInsetFiller } from '@/components/common/BottomInsetFiller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { apiClient } from '@/api/apiClient';
import { useCreateQnaPost } from '@/services/qna/mutations';
import SortableImage from '@/components/common/SortableImage';
import { useHeaderKeyboardOffset } from '@/hooks/use-header-keyboard-offset';

export default function QnaPostPage() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { keyboardVerticalOffset } = useHeaderKeyboardOffset();

  const createMutation = useCreateQnaPost();

  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);

  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [leaveVisible, setLeaveVisible] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  const newUploadedRef = useRef<string[]>([]);
  const imagesRef = useRef<string[]>([]);
  useEffect(() => { imagesRef.current = images; }, [images]);

  const pendingActionRef = useRef<any>(null);
  const bypassLeaveGuardRef = useRef(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (bypassLeaveGuardRef.current) return;
      const hasContent = content.trim() || imagesRef.current.length > 0;
      if (!hasContent) return;
      e.preventDefault();
      pendingActionRef.current = e.data.action;
      setLeaveVisible(true);
    });
    return unsubscribe;
  }, [navigation, content]);

  const cleanupNewUploads = async () => {
    const paths = newUploadedRef.current;
    if (paths.length === 0) return;
    await Promise.allSettled(
      paths.map((p) => apiClient.delete('/internal/image-work', { data: { imagePath: p } })),
    );
  };

  const handleConfirmLeave = async () => {
    setIsCleaning(true);
    await cleanupNewUploads();
    setIsCleaning(false);
    setLeaveVisible(false);
    bypassLeaveGuardRef.current = true;
    if (pendingActionRef.current) navigation.dispatch(pendingActionRef.current);
  };

  const handleSubmit = () => {
    if (!content.trim()) {
      Alert.alert('입력 오류', '문의 내용을 입력해 주세요.');
      return;
    }

    createMutation.mutate(
      { content: content.trim(), images },
      {
        onSuccess: (res) => {
          if (res.success) {
            newUploadedRef.current = [];
            bypassLeaveGuardRef.current = true;
            setSuccessVisible(true);
          } else {
            Alert.alert('등록 실패', res.message ?? '문의 등록에 실패했습니다.');
          }
        },
        onError: () => Alert.alert('등록 실패', '문의 등록 중 오류가 발생했습니다.'),
      },
    );
  };

  return (
    <View style={s.container}>
      {/* 이탈 방지 모달 */}
      <Modal visible={leaveVisible} transparent animationType="fade" onRequestClose={() => setLeaveVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={[s.modalIconWrap, { backgroundColor: '#fef2f2' }]}>
              <Ionicons name="alert-circle" size={36} color="#f87171" />
            </View>
            <Text style={s.modalTitle}>정말 나가시겠어요?</Text>
            <Text style={s.modalDesc}>
              작성 중인 내용은 저장되지 않으며{'\n'}
              업로드된 이미지도 모두 삭제됩니다.
            </Text>
            <View style={s.modalBtnRow}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={() => setLeaveVisible(false)} activeOpacity={0.8}>
                <Text style={s.modalCancelText}>계속 작성</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalLeaveBtn, isCleaning && { opacity: 0.6 }]}
                onPress={handleConfirmLeave}
                disabled={isCleaning}
                activeOpacity={0.8}
              >
                {isCleaning
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.modalLeaveText}>나가기</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 등록 완료 모달 */}
      <Modal visible={successVisible} transparent animationType="fade" onRequestClose={() => setSuccessVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={[s.modalIconWrap, { backgroundColor: '#60a5fa' }]}>
              <Ionicons name="checkmark" size={36} color="#fff" />
            </View>
            <Text style={s.modalTitle}>문의 등록 완료!</Text>
            <Text style={s.modalDesc}>영업일 기준 1~2일 내로 답변 드립니다.</Text>
            <TouchableOpacity
              style={s.modalPrimaryBtn}
              onPress={() => { setSuccessVisible(false); router.back(); }}
              activeOpacity={0.85}
            >
              <Text style={s.modalPrimaryText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 헤더 */}
      <View style={s.nav}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.navBack}>
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={s.navTitle}>1:1 문의하기</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={keyboardVerticalOffset}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 1:1 문의 안내 배너 (front 동일) */}
          <View style={s.banner}>
            <Text style={s.bannerEmoji}>💬</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.bannerTitle}>1:1 문의 안내</Text>
              <Text style={s.bannerBody}>
                영업일 기준 1~2일 내로 답변드립니다.{'\n'}이미지를 함께 첨부하면 더 정확한 안내를 받을 수 있어요.
              </Text>
            </View>
          </View>

          {/* 내용 */}
          <View style={s.section}>
            <Text style={s.label}>
              문의 내용 <Text style={s.charCount}>{content.length} / 1000</Text>
            </Text>
            <TextInput
              style={s.contentInput}
              value={content}
              onChangeText={(t) => t.length <= 1000 && setContent(t)}
              placeholder="문의하실 내용을 자세히 작성해 주세요..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={12}
              textAlignVertical="top"
            />
          </View>

          {/* 이미지 */}
          <View style={s.section}>
            <Text style={s.label}>
              이미지 첨부 <Text style={s.subInline}>최대 10장 (선택)</Text>
            </Text>
            <SortableImage
              folder="qna"
              onChange={setImages}
              onUploaded={(paths) => { newUploadedRef.current = [...newUploadedRef.current, ...paths]; }}
            />
          </View>

          <View style={{ height: keyboardVisible ? 120 : 8 }} />

          <View style={s.actionRow}>
            <TouchableOpacity style={s.cancelBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
              <Text style={s.cancelBtnText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.submitBtn, (!content.trim() || createMutation.isPending) && s.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!content.trim() || createMutation.isPending}
              activeOpacity={0.85}
            >
              {createMutation.isPending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.submitBtnText}>문의 등록하기</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomInsetFiller />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },

  nav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingTop: 10, paddingBottom: 10, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  navBack: { width: 40, alignItems: 'flex-start' },
  navTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },

  scroll: { padding: 16, gap: 12 },

  section: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#f1f5f9', gap: 10,
  },
  label: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  subInline: { fontSize: 12, color: '#94a3b8', fontWeight: '400' },
  charCount: { fontSize: 12, color: '#94a3b8', fontWeight: '400' },

  contentInput: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
    padding: 12, fontSize: 14, color: '#0f172a', minHeight: 220,
    backgroundColor: '#fff',
  },

  banner: {
    flexDirection: 'row', gap: 10, padding: 14, borderRadius: 12,
    backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe',
  },
  bannerEmoji: { fontSize: 18 },
  bannerTitle: { fontSize: 14, fontWeight: '600', color: '#3b82f6', marginBottom: 3 },
  bannerBody: { fontSize: 12, color: '#3b82f6', lineHeight: 18 },

  actionRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1, backgroundColor: '#f1f5f9', borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
  },
  cancelBtnText: { fontSize: 16, fontWeight: '500', color: '#64748b' },
  submitBtn: {
    flex: 2, backgroundColor: '#3b82f6', borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  submitBtnDisabled: { backgroundColor: '#cbd5e1', shadowOpacity: 0, elevation: 0 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(17,24,39,0.55)',
    alignItems: 'center', justifyContent: 'center', padding: 28,
  },
  modalCard: {
    width: '100%', maxWidth: 340, backgroundColor: '#fff',
    borderRadius: 24, paddingTop: 28, paddingBottom: 22, paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18, shadowRadius: 24, elevation: 8,
  },
  modalIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a', marginBottom: 8, textAlign: 'center' },
  modalDesc: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 21, marginBottom: 22 },
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
  modalPrimaryBtn: {
    width: '100%', backgroundColor: '#60a5fa', borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  modalPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
