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

  // useEffect(() => {
  //   onKeyboardChange?.(keyboardVisible);
  //   console.log(keyboardVisible);
  //   console.log(bottomInset);


  // }, [keyboardVisible]);

  return (
    <View style={[s.bar, { paddingBottom: keyboardVisible ? 15 : bottomInset + 15 }]}>
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
