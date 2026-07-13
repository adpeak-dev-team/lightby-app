import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/common/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

type Props = {
  checked: boolean;
  onChange: (v: boolean) => void;
  // 연령 확인(만 18세 이상) — App Store 가이드라인 1.2. 약관 동의와 별개의 필수 항목.
  ageChecked: boolean;
  onAgeChange: (v: boolean) => void;
  error?: boolean;
};

// 가입 전 이용약관(EULA) 동의 + 연령(18세 이상) 확인 — App Store 가이드라인 1.2
// 불쾌한 콘텐츠 및 악용 사용자에 대한 무관용 원칙을 명시하고, 약관/개인정보처리방침 링크를 제공한다.
export default function TermsAgreement({ checked, onChange, ageChecked, onAgeChange, error }: Props) {
  const router = useRouter();
  return (
    <View style={s.wrap}>
      {/* 연령 확인 (만 18세 이상) — 1.2 연령 등급 대응 */}
      <TouchableOpacity style={s.row} activeOpacity={0.8} onPress={() => onAgeChange(!ageChecked)}>
        <Ionicons
          name={ageChecked ? 'checkbox' : 'square-outline'}
          size={22}
          color={ageChecked ? '#3b82f6' : error ? '#ef4444' : '#94a3b8'}
        />
        <Text style={[s.label, error && !ageChecked && s.labelError]}>
          [필수] 만 18세 이상입니다.
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.row} activeOpacity={0.8} onPress={() => onChange(!checked)}>
        <Ionicons
          name={checked ? 'checkbox' : 'square-outline'}
          size={22}
          color={checked ? '#3b82f6' : error ? '#ef4444' : '#94a3b8'}
        />
        <Text style={[s.label, error && !checked && s.labelError]}>
          [필수] 이용약관 및 운영정책에 동의합니다.
        </Text>
      </TouchableOpacity>

      <Text style={s.notice}>
        번개분양은 불쾌한 콘텐츠 및 이용자 괴롭힘·악용 행위에 대해 무관용 원칙을 적용합니다.
        욕설·혐오·음란물 등 부적절한 게시물은 신고 접수 후 24시간 이내에 삭제되며, 해당 이용자는 이용이 제한될 수 있습니다.
      </Text>

      <View style={s.links}>
        <TouchableOpacity onPress={() => router.push({ pathname: '/terms', params: { doc: 'service' } })}>
          <Text style={s.link}>이용약관 보기</Text>
        </TouchableOpacity>
        <Text style={s.linkDivider}>·</Text>
        <TouchableOpacity onPress={() => router.push({ pathname: '/terms', params: { doc: 'privacy' } })}>
          <Text style={s.link}>개인정보처리방침</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginTop: 8, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#334155', flexShrink: 1 },
  labelError: { color: '#ef4444' },
  notice: { fontSize: 12, color: '#94a3b8', lineHeight: 18, marginTop: 8, paddingLeft: 30 },
  links: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, paddingLeft: 30 },
  link: { fontSize: 12, color: '#3b82f6', textDecorationLine: 'underline', fontWeight: '600' },
  linkDivider: { fontSize: 12, color: '#cbd5e1' },
});
