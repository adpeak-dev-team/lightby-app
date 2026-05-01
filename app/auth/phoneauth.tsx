import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSendOtp, useVerifyOtp, useVerifyPhoneAuth } from '@/services/auth/mutations';
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

export default function PhoneAuthPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId: userIdParam } = useLocalSearchParams<{ userId: string }>();
  const userId = userIdParam ? parseInt(userIdParam) : null;

  const [phone, setPhone] = useState('');
  const [phoneErr, setPhoneErr] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpErr, setOtpErr] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [timeLeft, setTimeLeft] = useState('03:00');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sendOtpMutate = useSendOtp();
  const verifyOtpMutate = useVerifyOtp();
  const verifyPhoneAuthMutate = useVerifyPhoneAuth();

  useEffect(() => {
    if (!userId) {
      router.replace('/auth/login');
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft('03:00');
    let left = 180;
    timerRef.current = setInterval(() => {
      if (left <= 1) {
        clearInterval(timerRef.current!);
        setTimeLeft('00:00');
        setOtpSent(false);
        setOtpCode('');
        setOtpErr('');
        setIsVerified(false);
        Alert.alert('인증 시간 만료', '인증 시간이 만료되었습니다. 다시 시도해주세요.');
      } else {
        left -= 1;
        setTimeLeft(formatTime(left));
      }
    }, 1000);
  };

  const handleSendOtp = () => {
    const purePhone = phone.replace(/\D/g, '');
    if (!purePhone) {
      setPhoneErr('전화번호를 입력해주세요.');
      return;
    }
    sendOtpMutate.mutate(purePhone, {
      onSuccess: () => {
        setPhoneErr('');
        setOtpErr('');
        setOtpSent(true);
        startTimer();
        Alert.alert('발송 완료', '인증번호가 발송되었습니다. 3분 내에 입력해주세요.');
      },
      onError: (err: any) => {
        setPhoneErr(err.response?.data?.message ?? '인증번호 발송에 실패했습니다.');
      },
    });
  };

  const handleVerifyOtp = () => {
    if (!otpCode) { setOtpErr('인증번호를 입력해주세요.'); return; }
    verifyOtpMutate.mutate(
      { phone: phone.replace(/\D/g, ''), otpCode },
      {
        onSuccess: () => {
          setIsVerified(true);
          setOtpSent(false);
          setOtpErr('');
          if (timerRef.current) clearInterval(timerRef.current);
        },
        onError: (err: any) => {
          setOtpErr(err.response?.data?.message ?? '인증에 실패했습니다.');
        },
      },
    );
  };

  const handleSubmit = () => {
    if (!isVerified) {
      Alert.alert('알림', '휴대폰 인증을 완료해주세요.');
      return;
    }
    if (!userId) {
      router.replace('/auth/login');
      return;
    }
    verifyPhoneAuthMutate.mutate(
      { userId, phone: phone.replace(/\D/g, ''), otpCode },
      {
        onSuccess: () => {
          toast.success('전화번호 인증이 완료되었습니다. 다시 로그인해주세요.');
          router.replace('/auth/login');
        },
        onError: (err: any) => {
          Alert.alert('오류', err.response?.data?.message ?? '인증 처리 중 오류가 발생했습니다.');
        },
      },
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={[s.container, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.headerWrap}>
          <Text style={s.title}>휴대폰 인증</Text>
          <Text style={s.sub}>계정을 사용하기 위해 휴대폰 인증이 필요합니다.</Text>
        </View>

        {/* 전화번호 입력 */}
        <View style={s.fieldWrap}>
          <Text style={s.label}>휴대폰 번호</Text>
          <View style={s.row}>
            <TextInput
              style={[s.input, { flex: 1 }, isVerified && s.inputDone]}
              value={phone}
              onChangeText={(v) => { setPhone(formatPhoneNumber(v)); setPhoneErr(''); }}
              placeholder="010-0000-0000"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
              editable={!isVerified}
            />
            {!isVerified && (
              <TouchableOpacity
                style={[s.subBtn, sendOtpMutate.isPending && s.subBtnDisabled]}
                onPress={handleSendOtp}
                disabled={sendOtpMutate.isPending}
              >
                <Text style={s.subBtnText}>
                  {sendOtpMutate.isPending ? '발송 중...' : otpSent ? '재전송' : '인증번호 발송'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {phoneErr ? <Text style={s.errText}>{phoneErr}</Text> : null}
        </View>

        {/* OTP 입력 */}
        {otpSent && !isVerified && (
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
            <TouchableOpacity
              style={[s.btn, s.btnGreen, (verifyOtpMutate.isPending || otpCode.length !== 6) && s.btnDisabled]}
              onPress={handleVerifyOtp}
              disabled={verifyOtpMutate.isPending || otpCode.length !== 6}
            >
              <Text style={s.btnText}>{verifyOtpMutate.isPending ? '확인 중...' : '인증 확인'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 인증 완료 상태 */}
        {isVerified && (
          <View style={s.successBox}>
            <Text style={s.successText}>✓ 휴대폰 인증이 완료되었습니다.</Text>
          </View>
        )}

        {/* 최종 제출 버튼 */}
        <TouchableOpacity
          style={[s.btn, s.btnBlue, (!isVerified || verifyPhoneAuthMutate.isPending) && s.btnDisabled]}
          onPress={handleSubmit}
          disabled={!isVerified || verifyPhoneAuthMutate.isPending}
        >
          <Text style={s.btnText}>
            {verifyPhoneAuthMutate.isPending ? '처리 중...' : '인증 완료'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#f9fafb', paddingHorizontal: 24 },
  headerWrap: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  sub: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
  fieldWrap: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  row: { flexDirection: 'row', gap: 8 },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    backgroundColor: '#fff', color: '#111827',
  },
  inputDone: { backgroundColor: '#f3f4f6', borderColor: '#e5e7eb' },
  inputErr: { borderColor: '#ef4444' },
  subBtn: {
    backgroundColor: '#3b82f6', borderRadius: 12, paddingHorizontal: 14,
    alignItems: 'center', justifyContent: 'center', minWidth: 90,
  },
  subBtnDisabled: { backgroundColor: '#9ca3af' },
  subBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  btn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  btnBlue: { backgroundColor: '#3b82f6' },
  btnGreen: { backgroundColor: '#10b981', marginTop: 10 },
  btnDisabled: { backgroundColor: '#9ca3af' },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  timer: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  timerExpired: { color: '#ef4444' },
  errText: { fontSize: 12, color: '#ef4444', marginTop: 4 },
  successBox: {
    backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac',
    borderRadius: 12, padding: 14, marginBottom: 16,
  },
  successText: { color: '#16a34a', fontSize: 14, fontWeight: '600' },
});
