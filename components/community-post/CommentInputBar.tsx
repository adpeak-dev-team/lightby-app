import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { TextInput } from '@/components/common/AppTextInput';
import { Text } from '@/components/common/AppText';
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
  anonymous: boolean;
  onAnonymousChange: (value: boolean) => void;
};

export default function CommentInputBar({
  value, onChange, onSubmit, isLoggedIn, isSubmitting, keyboardVisible, bottomInset, onKeyboardChange,
  anonymous, onAnonymousChange,
}: Props) {
  const canSubmit = isLoggedIn && value.trim().length > 0 && !isSubmitting;

  // 키보드가 올라오면 홈 인디케이터 영역이 키보드에 덮이므로 하단 여백이 필요 없다.
  // (여백을 그대로 두면 입력바와 키보드 사이가 떠 보인다)
  return (
    <View style={[s.wrap, { paddingBottom: keyboardVisible ? 12 : bottomInset + 12 }]}>
      {/* 익명 작성 — 게시글과 동일하게 작성 시점에 고정된다 */}
      {isLoggedIn && (
        <TouchableOpacity
          style={s.anonymousRow}
          onPress={() => onAnonymousChange(!anonymous)}
          activeOpacity={0.7}
          hitSlop={6}
        >
          <Ionicons
            name={anonymous ? 'checkbox' : 'square-outline'}
            size={18}
            color={anonymous ? '#3b82f6' : '#cbd5e1'}
          />
          <Text style={[s.anonymousText, anonymous && s.anonymousTextOn]}>익명으로 작성</Text>
        </TouchableOpacity>
      )}

      <View style={s.bar}>
        <TextInput
          style={s.input}
          value={value}
          onChangeText={onChange}
          placeholder={isLoggedIn ? '댓글을 입력해주세요...' : '로그인 후 댓글을 작성할 수 있습니다.'}
          placeholderTextColor="#94a3b8"
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
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    paddingTop: 10,
    borderTopWidth: 1, borderTopColor: '#f1f5f9',
    backgroundColor: '#fff',
  },
  anonymousRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingBottom: 8,
  },
  anonymousText: { fontSize: 13, color: '#94a3b8' },
  anonymousTextOn: { color: '#3b82f6', fontWeight: '600' },
  bar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingBottom: 5,
  },
  input: {
    flex: 1, minHeight: 40, maxHeight: 100,
    backgroundColor: '#f8fafc', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: '#0f172a',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  sendBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#bfdbfe' },
});
