import {
  View, TextInput, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderKeyboardOffset } from '@/hooks/use-header-keyboard-offset';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useSignIn } from '@/services/auth/mutations';
import { getOrCreateDeviceId } from '@/api/apiClient';
import { getPreferences } from '@/services/user/api';
import { toast } from '@/hooks/use-toast';
import { ERROR_CODES } from '@/lib/error-codes';

export default function LoginPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { keyboardVerticalOffset } = useHeaderKeyboardOffset();
  const signInMutate = useSignIn();

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    if (!loginId || !password) {
      setErrorMsg('아이디와 비밀번호를 입력해주세요.');
      return;
    }
    setErrorMsg('');
    const deviceId = await getOrCreateDeviceId();
    signInMutate.mutate(
      { loginId, password, deviceId },
      {
        onSuccess: async (data) => {
          if (data.needsPhoneAuth) {
            router.push({ pathname: '/auth/phoneauth', params: { userId: data.id } });
            return;
          }
          toast.success('로그인 되었습니다.');
          // 첫 로그인 여부 확인: 관심설정(지역·업종·직종)이 모두 비어있으면 관심 설정 페이지로
          try {
            const prefs = await getPreferences();
            const isEmpty =
              prefs.industries.length === 0 &&
              prefs.jobCategories.length === 0 &&
              prefs.userWorkRegions.length === 0;
            router.replace(isEmpty ? '/set-user-info/interest' : '/');
          } catch {
            router.replace('/');
          }
        },
        onError: (err: any) => {
          // PhoneAuthRequiredException (401 + errorCode). 서버는 열거형 이름이 아니라
          // 코드값('10008')을 내려주므로 반드시 ERROR_CODES 로 비교해야 한다.
          if (err.response?.data?.errorCode === ERROR_CODES.PHONE_AUTH_REQUIRED) {
            const userId = err.response.data.userId;
            router.push({ pathname: '/auth/phoneauth', params: { userId } });
            return;
          }
          setErrorMsg(err.response?.data?.message ?? '로그인에 실패했습니다.');
        },
      },
    );
  };

  // 로그인 화면은 replace(로그아웃/세션만료/소셜취소)로도 진입하므로 스택에 이전 화면이
  // 없을 수 있다 → 스와이프 뒤로가기가 불가능. 항상 동작하는 뒤로 버튼을 제공한다.
  const handleClose = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={keyboardVerticalOffset}>
      <TouchableOpacity
        style={[s.closeBtn, { top: 8 }]}
        onPress={handleClose}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="arrow-back" size={26} color="#334155" />
      </TouchableOpacity>
      <ScrollView
        contentContainerStyle={[s.container, { paddingTop: 24, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.logoWrap}>
          <TouchableOpacity onPress={() => router.push('/')}>
            <Image source={require('@/assets/images/logo.png')} style={s.logo} resizeMode="contain" />
          </TouchableOpacity>
          <Text style={s.title}>로그인</Text>
        </View>

        <View style={s.form}>
          <View style={s.inputWrap}>
            <Text style={s.label}>아이디</Text>
            <TextInput
              style={s.input}
              value={loginId}
              onChangeText={setLoginId}
              placeholder="아이디를 입력해주세요."
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={s.inputWrap}>
            <Text style={s.label}>비밀번호</Text>
            <TextInput
              style={s.input}
              value={password}
              onChangeText={setPassword}
              placeholder="비밀번호를 입력해주세요."
              placeholderTextColor="#94a3b8"
              secureTextEntry
            />
          </View>

          {errorMsg ? <Text style={s.errorText}>⚠️ {errorMsg}</Text> : null}

          <TouchableOpacity
            style={[s.loginBtn, signInMutate.isPending && s.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={signInMutate.isPending}
          >
            <Text style={s.loginBtnText}>
              {signInMutate.isPending ? '로그인 중...' : '로그인'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/auth/findpwd')} style={s.findPwdBtn}>
            <Text style={s.findPwdText}>비밀번호를 잊으셨나요?</Text>
          </TouchableOpacity>
        </View>

        <View style={s.dividerWrap}>
          <View style={s.dividerLine} />
          <Text style={s.dividerText}>또는 소셜 계정으로 로그인</Text>
          <View style={s.dividerLine} />
        </View>

        <TouchableOpacity style={s.kakaoBtn} onPress={() => router.push('/auth/kakao')}>
          <Text style={s.kakaoText}>카카오로 시작하기</Text>
        </TouchableOpacity>

        {Platform.OS === 'ios' && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={12}
            style={s.appleBtn}
            onPress={() => router.push('/auth/apple')}
          />
        )}

        <View style={s.footer}>
          <Text style={s.footerText}>아직 계정이 없으신가요? </Text>
          <TouchableOpacity onPress={() => router.push('/auth/register')}>
            <Text style={s.footerLink}>회원가입</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#f8fafc', paddingHorizontal: 24 },
  closeBtn: { position: 'absolute', left: 16, zIndex: 10, padding: 4 },
  logoWrap: { alignItems: 'center', marginBottom: 32, marginTop: 8 },
  logo: { width: 160, height: 56, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#0f172a' },
  form: { gap: 16 },
  inputWrap: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600', color: '#334155' },
  input: {
    borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, backgroundColor: '#fff', color: '#0f172a',
  },
  loginBtn: {
    backgroundColor: '#3b82f6', paddingVertical: 14,
    borderRadius: 12, alignItems: 'center', marginTop: 4,
  },
  loginBtnDisabled: { backgroundColor: '#93c5fd' },
  loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  findPwdBtn: { alignItems: 'center', marginTop: -4 },
  findPwdText: { fontSize: 12, color: '#64748b', textDecorationLine: 'underline' },
  dividerWrap: { flexDirection: 'row', alignItems: 'center', marginVertical: 28, gap: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
  dividerText: { fontSize: 12, color: '#94a3b8', fontWeight: '500', flexShrink: 1, textAlign: 'center' },
  kakaoBtn: { backgroundColor: '#FEE500', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  kakaoText: { color: '#191919', fontWeight: '700', fontSize: 16 },
  appleBtn: { height: 48, marginTop: 10 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  footerLink: { fontSize: 14, color: '#3b82f6', fontWeight: '600', textDecorationLine: 'underline' },
  errorText: {
    fontSize: 14, color: '#ef4444', fontWeight: '500', backgroundColor: '#fef2f2',
    padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#fee2e2',
  },
});
