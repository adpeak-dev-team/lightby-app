import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Image, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSignIn } from '@/services/auth/mutations';
import { getOrCreateDeviceId } from '@/api/apiClient';
import { toast } from '@/hooks/use-toast';

export default function LoginPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
        onSuccess: (data) => {
          if (data.needsPhoneAuth) {
            router.push({ pathname: '/auth/phoneauth', params: { userId: data.id } });
            return;
          }
          toast.success('로그인 되었습니다.');
          router.replace('/');
        },
        onError: (err: any) => {
          // PhoneAuthRequiredException (401 + errorCode)
          if (err.response?.data?.errorCode === 'PHONE_AUTH_REQUIRED') {
            const userId = err.response.data.userId;
            router.push({ pathname: '/auth/phoneauth', params: { userId } });
            return;
          }
          setErrorMsg(err.response?.data?.message ?? '로그인에 실패했습니다.');
        },
      },
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={[s.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
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
              placeholderTextColor="#9ca3af"
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
              placeholderTextColor="#9ca3af"
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
  container: { flexGrow: 1, backgroundColor: '#f9fafb', paddingHorizontal: 24 },
  logoWrap: { alignItems: 'center', marginBottom: 32, marginTop: 8 },
  logo: { width: 160, height: 56, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
  form: { gap: 16 },
  inputWrap: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151' },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, backgroundColor: '#fff', color: '#111827',
  },
  loginBtn: {
    backgroundColor: '#6366f1', paddingVertical: 14,
    borderRadius: 12, alignItems: 'center', marginTop: 4,
  },
  loginBtnDisabled: { backgroundColor: '#a5b4fc' },
  loginBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  findPwdBtn: { alignItems: 'center', marginTop: -4 },
  findPwdText: { fontSize: 13, color: '#6b7280', textDecorationLine: 'underline' },
  dividerWrap: { flexDirection: 'row', alignItems: 'center', marginVertical: 28, gap: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: { fontSize: 11, color: '#9ca3af', fontWeight: '500', flexShrink: 1, textAlign: 'center' },
  kakaoBtn: { backgroundColor: '#FEE500', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  kakaoText: { color: '#191919', fontWeight: '800', fontSize: 15 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { fontSize: 13, color: '#6b7280' },
  footerLink: { fontSize: 13, color: '#6366f1', fontWeight: '700', textDecorationLine: 'underline' },
  errorText: {
    fontSize: 13, color: '#ef4444', backgroundColor: '#fef2f2',
    padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#fee2e2',
  },
});
