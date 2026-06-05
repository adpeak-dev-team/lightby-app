import { Modal, View, Pressable, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/lib/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  message?: string;
}

/** 비회원이 보호된 동작을 시도할 때 뜨는 로그인 유도 모달 */
export function LoginPromptModal({ visible, onClose, message }: Props) {
  const router = useRouter();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose} />
      <View style={s.wrap} pointerEvents="box-none">
        <View style={s.card}>
          <View style={s.iconWrap}>
            <Ionicons name="lock-closed" size={28} color={Colors.primary} />
          </View>
          <Text style={s.title}>로그인이 필요합니다</Text>
          <Text style={s.desc}>{message ?? '로그인 후 이용할 수 있는 기능입니다.'}</Text>
          <View style={s.btnRow}>
            <TouchableOpacity style={s.cancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={s.cancelText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.loginBtn}
              onPress={() => { onClose(); router.push('/auth/login'); }}
              activeOpacity={0.85}
            >
              <Text style={s.loginText}>로그인하러 가기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(17,24,39,0.5)' },
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  card: {
    width: '100%', maxWidth: 340, backgroundColor: '#fff', borderRadius: 20,
    paddingTop: 24, paddingBottom: 18, paddingHorizontal: 22, alignItems: 'center',
  },
  iconWrap: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#e0f2fe',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  title: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 6 },
  desc: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 21, marginBottom: 20 },
  btnRow: { flexDirection: 'row', gap: 8, width: '100%' },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  loginBtn: { flex: 1.6, paddingVertical: 13, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center' },
  loginText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
