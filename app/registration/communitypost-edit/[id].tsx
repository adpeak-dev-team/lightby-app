import { useState, useEffect, useRef } from 'react';
import {
  View, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useGetCommunityPostById } from '@/services/community/queries';
import { useUpdateCommunityPost, useUpdateCommunityPostImages } from '@/services/community/mutations';
import SortableImage from '@/components/common/SortableImage';

export default function CommunityPostEditPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const postId = parseInt(id);
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const { data: post, isLoading } = useGetCommunityPostById(postId);
  const updateMutation = useUpdateCommunityPost();
  const updateImagesMutation = useUpdateCommunityPostImages();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [leaveVisible, setLeaveVisible] = useState(false);

  const pendingActionRef = useRef<any>(null);

  // 기존 데이터 초기화
  useEffect(() => {
    if (post && !isInitialized) {
      setTitle(post.title ?? '');
      setContent(post.content ?? '');
      setImages(Array.isArray(post.image) ? post.image : []);
      setIsInitialized(true);
    }
  }, [post, isInitialized]);

  // 나가기 방지
  useEffect(() => {
    if (!isInitialized) return;
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (updateMutation.isSuccess) return;
      e.preventDefault();
      pendingActionRef.current = e.data.action;
      setLeaveVisible(true);
    });
    return unsubscribe;
  }, [navigation, isInitialized, updateMutation.isSuccess]);

  // 이미지 변경 즉시 DB 반영
  const handleImagesChange = (newImages: string[]) => {
    setImages(newImages);
    updateImagesMutation.mutate({ id: postId, images: newImages });
  };

  const handleSubmit = () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('입력 오류', '제목과 내용을 모두 입력해 주세요.');
      return;
    }

    updateMutation.mutate(
      { id: postId, payload: { title: title.trim(), content: content.trim(), images } },
      {
        onSuccess: (res) => {
          if (res.success) {
            Alert.alert('수정 완료', '게시글이 수정되었습니다.', [
              {
                text: '확인',
                onPress: () => router.replace(`/posts/board/${postId}` as never),
              },
            ]);
          } else {
            Alert.alert('오류', res.message ?? '수정에 실패했습니다.');
          }
        },
        onError: () => Alert.alert('오류', '게시글 수정 중 오류가 발생했습니다.'),
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
      <Modal visible={leaveVisible} transparent animationType="fade" onRequestClose={() => setLeaveVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={[s.modalIconWrap, { backgroundColor: '#fef2f2' }]}>
              <Ionicons name="alert-circle" size={36} color="#f87171" />
            </View>
            <Text style={s.modalTitle}>수정을 그만두시겠어요?</Text>
            <Text style={s.modalDesc}>
              저장하지 않은 내용은 반영되지 않습니다.{'\n'}
              (이미지 변경은 이미 저장되었습니다.)
            </Text>
            <View style={s.modalBtnRow}>
              <TouchableOpacity style={s.modalCancelBtn} onPress={() => setLeaveVisible(false)} activeOpacity={0.8}>
                <Text style={s.modalCancelText}>계속 수정</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.modalLeaveBtn}
                onPress={() => {
                  setLeaveVisible(false);
                  if (pendingActionRef.current) navigation.dispatch(pendingActionRef.current);
                }}
                activeOpacity={0.8}
              >
                <Text style={s.modalLeaveText}>나가기</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 헤더 */}
      <View style={s.nav}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.navBack}>
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={s.navTitle}>게시글 수정</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 제목 */}
          <View style={s.section}>
            <Text style={s.label}>제목</Text>
            <TextInput
              style={s.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="제목을 입력해 주세요"
              placeholderTextColor="#94a3b8"
              maxLength={60}
            />
          </View>

          {/* 이미지 — 변경 즉시 DB 반영 */}
          <View style={s.section}>
            <Text style={s.label}>
              이미지 첨부 <Text style={s.subInline}>최대 10장</Text>
            </Text>
            <SortableImage
              folder="boardfee"
              initialImages={images}
              onChange={handleImagesChange}
            />
          </View>

          {/* 내용 */}
          <View style={s.section}>
            <Text style={s.label}>내용</Text>
            <TextInput
              style={s.contentInput}
              value={content}
              onChangeText={setContent}
              placeholder="이곳에 내용을 작성해 주세요..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={10}
              textAlignVertical="top"
            />
          </View>

          {/* 이미지 저장 중 표시 */}
          {updateImagesMutation.isPending && (
            <View style={s.imageSavingBar}>
              <ActivityIndicator size="small" color="#3b82f6" />
              <Text style={s.imageSavingText}>이미지 저장 중...</Text>
            </View>
          )}

          <View style={s.actionRow}>
            <TouchableOpacity style={s.cancelBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
              <Text style={s.cancelBtnText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                s.submitBtn,
                (!title.trim() || !content.trim() || updateMutation.isPending) && s.submitBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!title.trim() || !content.trim() || updateMutation.isPending}
              activeOpacity={0.85}
            >
              {updateMutation.isPending
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.submitBtnText}>수정 완료</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  nav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 16,
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

  titleInput: {
    borderBottomWidth: 1, borderBottomColor: '#e2e8f0',
    paddingVertical: 8, fontSize: 14, color: '#0f172a',
  },
  contentInput: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12,
    padding: 12, fontSize: 14, color: '#0f172a', minHeight: 200,
    backgroundColor: '#fff',
  },

  imageSavingBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 8,
  },
  imageSavingText: { fontSize: 13, color: '#64748b' },

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
});
