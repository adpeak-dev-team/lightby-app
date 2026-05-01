import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFindPasswordSendOtp, useResetPassword } from '@/services/auth/mutations';
import { toast } from '@/hooks/use-toast';

const formatPhoneNumber = (raw: string) => {
  const nums = raw.replace(/\D/g, '').slice(0, 11);
  if (nums.length <= 3) return nums;
  if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
  return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7)}`;
};
const formatTime = (sec: number) => {
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
};

type Step = 'input' | 'otp' | 'newpwd';

export default function FindPasswordPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<Step>('input');

  // Step 1
  const [loginId, setLoginId] = useState('');
  const [phone, setPhone] = useState('');
  const [inputErr, setInputErr] = useState('');

  // Step 2
  const [otpCode, setOtpCode] = useState('');
  const [otpErr, setOtpErr] = useState('');
  const [timeLeft, setTimeLeft] = useState('03:00');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Step 3
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdErr, setPwdErr] = useState('');

  const sendOtpMutate = useFindPasswordSendOtp();
  const resetPasswordMutate = useResetPassword();

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft('03:00');
    let left = 180;
    timerRef.current = setInterval(() => {
      if (left <= 1) {
        clearInterval(timerRef.current!);
        setTimeLeft('00:00');
        setOtpCode('');
        setOtpErr('');
        Alert.alert('인증 시간 만료', '인증번호를 다시 발송해주세요.', [
          { text: '확인', onPress: () => router.replace('/auth/login') },
        ]);
      } else {
        left -= 1;
        setTimeLeft(formatTime(left));
      }
    }, 1000);
  };

  // Step 1: OTP 발송
  const handleSendOtp = () => {
    if (!loginId.trim() || !phone.trim()) {
      setInputErr('아이디와 휴대폰 번호를 모두 입력해주세요.');
      return;
    }
    setInputErr('');
    sendOtpMutate.mutate(
      { loginId: loginId.trim(), phone: phone.replace(/\D/g, '') },
      {
        onSuccess: () => {
          Alert.alert('발송 완료', '인증번호가 발송되었습니다. 3분 내에 입력해주세요.');
          startTimer();
          setStep('otp');
        },
        onError: (err: any) => {
          setInputErr(err.response?.data?.message ?? '일치하는 계정을 찾을 수 없습니다.');
        },
      },
    );
  };

  // Step 2: OTP 재발송
  const handleResendOtp = () => {
    setOtpCode('');
    setOtpErr('');
    sendOtpMutate.mutate(
      { loginId: loginId.trim(), phone: phone.replace(/\D/g, '') },
      {
        onSuccess: () => {
          startTimer();
          toast.success('인증번호를 재발송했습니다.');
        },
        onError: (err: any) => {
          setOtpErr(err.response?.data?.message ?? '재발송에 실패했습니다.');
        },
      },
    );
  };

  // Step 2: OTP 확인 (서버 최종 검증은 reset 시 진행)
  const handleVerifyOtp = () => {
    if (otpCode.length !== 6) {
      setOtpErr('인증번호 6자리를 입력해주세요.');
      return;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setStep('newpwd');
  };

  // Step 3: 비밀번호 재설정
  const handleResetPassword = () => {
    if (newPwd.length < 8 || newPwd.length > 20) {
      setPwdErr('비밀번호는 8~20자리로 입력해주세요.');
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdErr('비밀번호가 일치하지 않습니다.');
      return;
    }
    setPwdErr('');
    resetPasswordMutate.mutate(
      {
        loginId: loginId.trim(),
        phone: phone.replace(/\D/g, ''),
        otpCode,
        newPassword: newPwd,
      },
      {
        onSuccess: () => {
          Alert.alert('변경 완료', '비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.', [
            { text: '확인', onPress: () => router.replace('/auth/login') },
          ]);
        },
        onError: (err: any) => {
          setPwdErr(err.response?.data?.message ?? '비밀번호 변경에 실패했습니다.');
        },
      },
    );
  };

  const stepTitle = step === 'input'
    ? '비밀번호 찾기'
    : step === 'otp'
      ? '인증번호 확인'
      : '새 비밀번호 설정';

  const stepSub = step === 'input'
    ? '가입 시 등록한 아이디와 휴대폰 번호를 입력해주세요.'
    : step === 'otp'
      ? '휴대폰으로 발송된 인증번호를 입력해주세요.'
      : '새로운 비밀번호를 입력해주세요.';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={[s.container, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* 헤더 */}
        <View style={s.headerWrap}>
          <Text style={s.title}>{stepTitle}</Text>
          <Text style={s.sub}>{stepSub}</Text>
        </View>

        {/* Step 인디케이터 */}
        <View style={s.stepWrap}>
          {(['input', 'otp', 'newpwd'] as Step[]).map((s_) => (
            <View key={s_} style={[stepDot(step === s_ || (step === 'otp' && s_ === 'input') || (step === 'newpwd'))]} />
          ))}
        </View>

        {/* Step 1: 아이디 + 전화번호 */}
        {step === 'input' && (
          <View style={s.form}>
            <View style={s.fieldWrap}>
              <Text style={s.label}>아이디</Text>
              <TextInput
                style={s.input}
                value={loginId}
                onChangeText={(v) => { setLoginId(v); setInputErr(''); }}
                placeholder="아이디를 입력하세요"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View style={s.fieldWrap}>
              <Text style={s.label}>휴대폰 번호</Text>
              <TextInput
                style={s.input}
                value={phone}
                onChangeText={(v) => { setPhone(formatPhoneNumber(v)); setInputErr(''); }}
                placeholder="010-0000-0000"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
              />
            </View>
            {inputErr ? <Text style={s.errText}>{inputErr}</Text> : null}
            <TouchableOpacity
              style={[s.btn, s.btnBlue, sendOtpMutate.isPending && s.btnDisabled]}
              onPress={handleSendOtp}
              disabled={sendOtpMutate.isPending}
            >
              <Text style={s.btnText}>{sendOtpMutate.isPending ? '확인 중...' : '인증번호 발송'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.replace('/auth/login')} style={s.linkBtn}>
              <Text style={s.linkText}>로그인으로 돌아가기</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 2: OTP */}
        {step === 'otp' && (
          <View style={s.form}>
            <View style={s.fieldWrap}>
              <View style={s.labelRow}>
                <Text style={s.label}>인증번호</Text>
                <Text style={[s.timer, timeLeft === '00:00' && s.timerExpired]}>{timeLeft}</Text>
              </View>
              <TextInput
                style={[s.input, otpErr ? s.inputErr : {}]}
                value={otpCode}
                onChangeText={(v) => { setOtpCode(v.replace(/\D/g, '').slice(0, 6)); setOtpErr(''); }}
                placeholder="인증번호 6자리"
                placeholderTextColor="#9ca3af"
                keyboardType="number-pad"
                maxLength={6}
              />
              {otpErr ? <Text style={s.errText}>{otpErr}</Text> : null}
            </View>
            <TouchableOpacity
              style={[s.btn, s.btnGreen, otpCode.length !== 6 && s.btnDisabled]}
              onPress={handleVerifyOtp}
              disabled={otpCode.length !== 6}
            >
              <Text style={s.btnText}>인증 확인</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleResendOtp}
              disabled={sendOtpMutate.isPending}
              style={s.linkBtn}
            >
              <Text style={s.linkTextBlue}>
                {sendOtpMutate.isPending ? '재발송 중...' : '인증번호 재발송'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 3: 새 비밀번호 */}
        {step === 'newpwd' && (
          <View style={s.form}>
            <View style={s.successBox}>
              <Text style={s.successText}>✓ 인증이 완료되었습니다.</Text>
            </View>
            <View style={s.fieldWrap}>
              <Text style={s.label}>새 비밀번호</Text>
              <TextInput
                style={[s.input, pwdErr ? s.inputErr : {}]}
                value={newPwd}
                onChangeText={(v) => { setNewPwd(v); setPwdErr(''); }}
                placeholder="8~20자리 비밀번호"
                placeholderTextColor="#9ca3af"
                secureTextEntry
              />
            </View>
            <View style={s.fieldWrap}>
              <Text style={s.label}>비밀번호 확인</Text>
              <TextInput
                style={[s.input, pwdErr ? s.inputErr : {}]}
                value={confirmPwd}
                onChangeText={(v) => { setConfirmPwd(v); setPwdErr(''); }}
                placeholder="비밀번호를 다시 입력하세요"
                placeholderTextColor="#9ca3af"
                secureTextEntry
              />
            </View>
            {pwdErr ? <Text style={s.errText}>{pwdErr}</Text> : null}
            <TouchableOpacity
              style={[s.btn, s.btnBlue, (resetPasswordMutate.isPending || !newPwd || !confirmPwd) && s.btnDisabled]}
              onPress={handleResetPassword}
              disabled={resetPasswordMutate.isPending || !newPwd || !confirmPwd}
            >
              <Text style={s.btnText}>
                {resetPasswordMutate.isPending ? '변경 중...' : '비밀번호 변경'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const stepDot = (active: boolean) => ({
  width: active ? 24 : 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: active ? '#6366f1' : '#d1d5db',
});

const s = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#f9fafb', paddingHorizontal: 24 },
  headerWrap: { alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  sub: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
  stepWrap: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 28 },
  form: { gap: 12 },
  fieldWrap: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151' },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    backgroundColor: '#fff', color: '#111827',
  },
  inputErr: { borderColor: '#ef4444' },
  btn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  btnBlue: { backgroundColor: '#3b82f6' },
  btnGreen: { backgroundColor: '#10b981' },
  btnDisabled: { backgroundColor: '#9ca3af' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  timer: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  timerExpired: { color: '#ef4444' },
  errText: { fontSize: 12, color: '#ef4444' },
  linkBtn: { alignItems: 'center', paddingVertical: 8 },
  linkText: { fontSize: 13, color: '#9ca3af', textDecorationLine: 'underline' },
  linkTextBlue: { fontSize: 13, color: '#3b82f6', fontWeight: '600' },
  successBox: {
    backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac',
    borderRadius: 12, padding: 14,
  },
  successText: { color: '#16a34a', fontSize: 14, fontWeight: '600' },
});
