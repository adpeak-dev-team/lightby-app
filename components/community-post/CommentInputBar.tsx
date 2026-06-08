import { useEffect } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  value: string;
  onChange: (text: string) => void;
  onSubmit: () => void;
  isLoggedIn: boolean;
  isSubmitting: boolean;
  keyboardVisible: boolean;
  bottomInset: number;
  onKeyboardChange?: (visible: boolean) => void;
};

export default function CommentInputBar({
  value, onChange, onSubmit, isLoggedIn, isSubmitting, keyboardVisible, bottomInset, onKeyboardChange,
}: Props) {
  const canSubmit = isLoggedIn && value.trim().length > 0 && !isSubmitting;

  // 키보드 표시 여부에 따라 paddingBottom을 토글하면, KeyboardAvoidingView 애니메이션과
  // 어긋나 입력바가 올라갔다 다시 내려가며 가려지는 현상이 생긴다. 따라서 항상 동일한
  // 하단 여백(홈 인디케이터 확보)을 유지해 충돌을 없앤다.
  return (
    <View style={[s.bar, { paddingBottom: bottomInset + 12 }]}>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChange}
        placeholder={isLoggedIn ? '댓글을 입력해주세요...' : '로그인 후 댓글을 작성할 수 있습니다.'}
        placeholderTextColor="#9ca3af"
        editable={isLoggedIn}
        multiline
        maxLength={500}
      />
      <TouchableOpacity
        style={[s.sendBtn, !canSubmit && s.sendBtnDisabled]}
        onPress={onSubmit}
        disabled={!canSubmit}
      >
        <Ionicons name="send" size={16} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingTop: 15, paddingBottom: 15,
    borderTopWidth: 1, borderTopColor: '#f3f4f6',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1, minHeight: 40, maxHeight: 100,
    backgroundColor: '#f9fafb', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: '#111827',
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  sendBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#0ea5e9', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#bae6fd' },
});
