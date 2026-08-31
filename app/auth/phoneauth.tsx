import {
  View, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { TextInput } from '@/components/common/AppTextInput';
import { Text } from '@/components/common/AppText';
import { useState, useRef, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderKeyboardOffset } from '@/hooks/use-header-keyboard-offset';
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
  const { keyboardVerticalOffset } = useHeaderKeyboardOffset();
  const { userId: userIdParam } = useLocalSearchParams<{ userId: string }>();
  const userId = userIdParam ? parseInt(userIdParam) : null;

  const [phone, setPhone] = useState('');
  const [phoneErr, setPhoneErr] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpErr, setOtpErr] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  // 남은 시간은 숫자로 들고 표시할 때만 포맷한다 (임박 여부 판단에 문자열 파싱이 필요 없도록)
  const [secondsLeft, setSecondsLeft] = useState(180);
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
    let left = 180;
    setSecondsLeft(left);
    timerRef.current = setInterval(() => {
      if (left <= 1) {
        clearInterval(timerRef.current!);
        setSecondsLeft(0);
        setOtpSent(false);
        setOtpCode('');
        setOtpErr('');
        setIsVerified(false);
        Alert.alert('인증 시간 만료', '인증 시간이 만료되었습니다. 다시 시도해주세요.');
      } else {
        left -= 1;
        setSecondsLeft(left);
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
          // 409(이미 사용 중인 번호)는 이 번호로는 더 진행할 수 없다 →
          // 인증 상태를 처음으로 되돌려 다른 번호를 입력하게 한다.
          if (err?.response?.status === 409) {
            if (timerRef.current) clearInterval(timerRef.current);
            setIsVerified(false);
            setOtpSent(false);
            setOtpCode('');
            setOtpErr('');
            setPhoneErr('이미 사용 중인 전화번호입니다. 다른 번호를 입력해주세요.');
            Alert.alert('이미 사용 중인 전화번호입니다.', '다른 번호로 다시 인증해주세요.');
            return;
          }
          Alert.alert('오류', err.response?.data?.message ?? '인증 처리 중 오류가 발생했습니다.');
        },
      },
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={keyboardVerticalOffset}>
      <ScrollView
        contentContainerStyle={[s.container, { paddingTop: 32, paddingBottom: insets.bottom + 24 }]}
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
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              editable={!isVerified}
            />
            {!isVerified && (
              // 발송 전에는 이게 유일한 액션이라 파란 채움, 발송 후엔 '인증 확인'에 주목도를 넘기고
              // 재전송은 외곽선 보조 버튼으로 내린다.
              <TouchableOpacity
                style={[
                  s.subBtn,
                  otpSent && s.subBtnOutline,
                  sendOtpMutate.isPending && s.subBtnDisabled,
                ]}
                onPress={handleSendOtp}
                disabled={sendOtpMutate.isPending}
              >
                <Text style={[
                  s.subBtnText,
                  otpSent && s.subBtnOutlineText,
                  sendOtpMutate.isPending && s.subBtnDisabledText,
                ]}>
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
              <View style={[s.timerWrap, secondsLeft <= 30 && s.timerWrapUrgent]}>
                <Text style={[s.timer, secondsLeft <= 30 && s.timerUrgent]}>
                  {formatTime(secondsLeft)}
                </Text>
              </View>
            </View>
            <TextInput
              style={[s.input, s.otpInput, otpErr ? s.inputErr : {}]}
              value={otpCode}
              onChangeText={(v) => { setOtpCode(v.replace(/\D/g, '').slice(0, 6)); setOtpErr(''); }}
              placeholder="000000"
              placeholderTextColor="#cbd5e1"
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
            />
            {otpErr ? <Text style={s.errText}>{otpErr}</Text> : null}
            <TouchableOpacity
              style={[s.btn, s.btnBlue, (verifyOtpMutate.isPending || otpCode.length !== 6) && s.btnDisabled]}
              onPress={handleVerifyOtp}
              disabled={verifyOtpMutate.isPending || otpCode.length !== 6}
            >
              <Text style={[s.btnText, (verifyOtpMutate.isPending || otpCode.length !== 6) && s.btnDisabledText]}>
                {verifyOtpMutate.isPending ? '확인 중...' : '인증 확인'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 인증 완료 상태 — 여기서만 최종 버튼이 등장한다.
            예전엔 '인증 확인'과 '인증 완료'가 동시에, 둘 다 회색으로 떠서
            어느 것을 눌러야 하는지 알 수 없었다. 단계당 액션은 하나만 보인다. */}
        {isVerified && (
          <>
            <View style={s.successBox}>
              <Text style={s.successText}>✓ 휴대폰 인증이 완료되었습니다.</Text>
            </View>
            <TouchableOpacity
              style={[s.btn, s.btnBlue, verifyPhoneAuthMutate.isPending && s.btnDisabled]}
              onPress={handleSubmit}
              disabled={verifyPhoneAuthMutate.isPending}
            >
              <Text style={[s.btnText, verifyPhoneAuthMutate.isPending && s.btnDisabledText]}>
                {verifyPhoneAuthMutate.isPending ? '처리 중...' : '인증 완료'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#f8fafc', paddingHorizontal: 24 },
  headerWrap: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 24, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  sub: { fontSize: 14, color: '#64748b', textAlign: 'center' },
  fieldWrap: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#334155', marginBottom: 6 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  row: { flexDirection: 'row', gap: 8 },
  input: {
    borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14,
    backgroundColor: '#fff', color: '#0f172a',
  },
  inputDone: { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' },
  inputErr: { borderColor: '#ef4444' },
  // 인증번호는 6자리 숫자 하나만 넣는 칸이라 크게·가운데·자간을 벌려 입력 상태가 한눈에 보이게
  otpInput: {
    fontSize: 24, fontWeight: '700', textAlign: 'center',
    letterSpacing: 8, paddingVertical: 14,
  },
  subBtn: {
    backgroundColor: '#3b82f6', borderRadius: 12, paddingHorizontal: 14,
    alignItems: 'center', justifyContent: 'center', minWidth: 90,
    borderWidth: 1.5, borderColor: '#3b82f6',
  },
  // 인증번호 발송 후: 주목도를 '인증 확인'에 넘기는 외곽선 버튼
  subBtnOutline: { backgroundColor: '#fff', borderColor: '#cbd5e1' },
  subBtnOutlineText: { color: '#475569' },
  subBtnDisabled: { backgroundColor: '#e2e8f0', borderColor: '#e2e8f0' },
  subBtnDisabledText: { color: '#94a3b8' },
  subBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  btn: { borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 10 },
  btnBlue: { backgroundColor: '#3b82f6' },
  // 비활성은 '연한 배경 + 흐린 글씨'로. 예전의 진한 회색(#94a3b8) + 흰 글씨는
  // 눌리는 버튼처럼 보여서 사용자가 계속 탭하게 만들었다.
  btnDisabled: { backgroundColor: '#e2e8f0' },
  btnDisabledText: { color: '#94a3b8' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  // 남은 시간 — 눈에 띄게 알약 배경, 30초 이하부터 빨강
  timerWrap: {
    backgroundColor: '#eff6ff', borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  timerWrapUrgent: { backgroundColor: '#fef2f2' },
  timer: { fontSize: 13, fontWeight: '700', color: '#2563eb' },
  timerUrgent: { color: '#ef4444' },
  errText: { fontSize: 14, color: '#ef4444', marginTop: 4 },
  successBox: {
    backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac',
    borderRadius: 12, padding: 14, marginBottom: 16,
  },
  successText: { color: '#16a34a', fontSize: 14, fontWeight: '500' },
});
