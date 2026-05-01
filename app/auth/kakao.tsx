import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { login } from '@react-native-seoul/kakao-login';
import { getOrCreateDeviceId } from '@/api/apiClient';
import { useOAuthKakaoSignIn, useOAuthSignUp, useCheckNickname, useSendOtp, useVerifyOtp } from '@/services/auth/mutations';
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

type KakaoProfile = {
  snsId: string; name: string; nickname: string;
  phone: string | null; profileImage: string | null; thumbnailImage: string | null;
};
type Conflicts = {
  isNicknameDuplicate: boolean; isPhoneDuplicate: boolean;
  isNicknameMissing: boolean; isPhoneMissing: boolean;
};

export default function KakaoLoginPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [kakaoProfile, setKakaoProfile] = useState<KakaoProfile | null>(null);
  const [conflicts, setConflicts] = useState<Conflicts | null>(null);

  // 닉네임
  const [nickname, setNickname] = useState('');
  const [needsNickname, setNeedsNickname] = useState(false);
  const [isNicknameVerified, setIsNicknameVerified] = useState(false);
  const [nicknameErr, setNicknameErr] = useState('');

  // 전화번호
  const [phone, setPhone] = useState('');
  const [needsPhone, setNeedsPhone] = useState(false);
  const [phoneErr, setPhoneErr] = useState('');
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);

  // OTP
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpErr, setOtpErr] = useState('');
  const [timeLeft, setTimeLeft] = useState('03:00');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const oauthSignInMutate = useOAuthKakaoSignIn();
  const oauthSignUpMutate = useOAuthSignUp();
  const checkNicknameMutate = useCheckNickname();
  const sendOtpMutate = useSendOtp();
  const verifyOtpMutate = useVerifyOtp();

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
        setIsPhoneVerified(false);
        Alert.alert('인증 시간 만료', '인증 시간이 만료되었습니다. 다시 시도해주세요.');
      } else {
        left -= 1;
        setTimeLeft(formatTime(left));
      }
    }, 1000);
  };

  useEffect(() => {
    handleKakaoLogin();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const handleKakaoLogin = async () => {
    setIsLoading(true);
    try {
      const token = await login();
      const deviceId = await getOrCreateDeviceId();

      oauthSignInMutate.mutate(
        { kakaoAccessToken: token.accessToken, deviceId },
        {
          onSuccess: (data) => {
            // 시나리오 1: 로그인 완료
            if (data.accessToken) {
              toast.success('로그인 되었습니다.');
              router.replace('/');
              return;
            }
            // 시나리오 2: 기존 사용자, 전화번호 인증 필요
            if (data.isExistingUser && data.needsPhoneAuth) {
              router.replace({ pathname: '/auth/phoneauth', params: { userId: data.userId } });
              return;
            }
            // 시나리오 3: 신규 사용자
            if (data.isNewUser && data.kakaoProfile && data.conflicts) {
              setKakaoProfile(data.kakaoProfile);
              setConflicts(data.conflicts);
              const c = data.conflicts;
              const needsNick = c.isNicknameDuplicate || c.isNicknameMissing;
              const needsPh = c.isPhoneDuplicate || c.isPhoneMissing;
              setNeedsNickname(needsNick);
              setNeedsPhone(needsPh);
              if (data.kakaoProfile.nickname) setNickname(data.kakaoProfile.nickname);
              if (data.kakaoProfile.phone) setPhone(formatPhoneNumber(data.kakaoProfile.phone));
              setShowForm(true);
            }
          },
          onError: (err: any) => {
            console.error('[Kakao] 로그인 실패:', err?.response?.data);
            Alert.alert('오류', '카카오 로그인 중 오류가 발생했습니다.', [
              { text: '확인', onPress: () => router.replace('/auth/login') },
            ]);
          },
          onSettled: () => setIsLoading(false),
        },
      );
    } catch (err: any) {
      console.error('[Kakao] SDK 오류:', err?.message);
      setIsLoading(false);
      Alert.alert('오류', '카카오 로그인을 취소하거나 오류가 발생했습니다.', [
        { text: '확인', onPress: () => router.replace('/auth/login') },
      ]);
    }
  };

  const handleCheckNickname = () => {
    if (nickname.length < 2) {
      setNicknameErr('닉네임은 2글자 이상이어야 합니다.');
      return;
    }
    checkNicknameMutate.mutate(nickname, {
      onSuccess: () => {
        setNicknameErr('');
        setIsNicknameVerified(true);
      },
      onError: (err: any) => {
        setNicknameErr(err.response?.data?.message ?? '이미 사용 중인 닉네임입니다.');
        setIsNicknameVerified(false);
      },
    });
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
      onError: () => {
        setPhoneErr('인증번호 발송에 실패했습니다. 잠시 후 다시 시도해주세요.');
      },
    });
  };

  const handleVerifyOtp = () => {
    if (!otpCode) { setOtpErr('인증번호를 입력해주세요.'); return; }
    const purePhone = phone.replace(/\D/g, '');
    verifyOtpMutate.mutate(
      { phone: purePhone, otpCode },
      {
        onSuccess: () => {
          setIsPhoneVerified(true);
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

  const handleSignUp = async () => {
    if (needsNickname && !isNicknameVerified) {
      Alert.alert('알림', '닉네임 중복 확인을 완료해주세요.');
      return;
    }
    if (needsPhone && !isPhoneVerified) {
      Alert.alert('알림', '휴대폰 인증을 완료해주세요.');
      return;
    }
    if (!kakaoProfile) return;

    const deviceId = await getOrCreateDeviceId();
    oauthSignUpMutate.mutate(
      {
        snsId: kakaoProfile.snsId,
        snsType: 'KAKAO',
        name: kakaoProfile.name,
        nickname: needsNickname ? nickname : kakaoProfile.nickname,
        phone: needsPhone ? phone.replace(/\D/g, '') : (kakaoProfile.phone ?? ''),
        profileImage: kakaoProfile.profileImage,
        thumbnailImage: kakaoProfile.thumbnailImage,
        deviceId,
      },
      {
        onSuccess: () => {
          toast.success('회원가입이 완료되었습니다!');
          router.replace('/');
        },
        onError: (err: any) => {
          Alert.alert('오류', err.response?.data?.message ?? '회원가입에 실패했습니다.');
        },
      },
    );
  };

  // 로딩 화면
  if (isLoading) {
    return (
      <View style={[s.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#FEE500" />
        <Text style={s.loadingText}>카카오 로그인 처리 중...</Text>
      </View>
    );
  }

  // 추가 정보 입력 폼
  if (showForm) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[s.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.headerWrap}>
            <Text style={s.headerTitle}>카카오 회원가입</Text>
            {conflicts && (
              <Text style={s.headerSub}>
                {(conflicts.isNicknameDuplicate || conflicts.isNicknameMissing) && '닉네임 등록이 필요합니다.  '}
                {(conflicts.isPhoneDuplicate || conflicts.isPhoneMissing) && '전화번호 인증이 필요합니다.'}
              </Text>
            )}
          </View>

          {/* 닉네임 */}
          {needsNickname && (
            <View style={s.fieldWrap}>
              <Text style={s.label}>닉네임 (2~10자)</Text>
              <View style={s.row}>
                <TextInput
                  style={[s.input, { flex: 1 }]}
                  value={nickname}
                  onChangeText={(v) => { setNickname(v); setIsNicknameVerified(false); setNicknameErr(''); }}
                  placeholder="닉네임을 입력하세요"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={[s.subBtn, isNicknameVerified && s.subBtnDone]}
                  onPress={handleCheckNickname}
                  disabled={checkNicknameMutate.isPending || isNicknameVerified}
                >
                  <Text style={s.subBtnText}>
                    {isNicknameVerified ? '확인완료' : checkNicknameMutate.isPending ? '확인 중...' : '중복확인'}
                  </Text>
                </TouchableOpacity>
              </View>
              {nicknameErr ? <Text style={s.errText}>{nicknameErr}</Text> : null}
              {isNicknameVerified ? <Text style={s.okText}>✓ 사용 가능한 닉네임입니다.</Text> : null}
            </View>
          )}

          {/* 전화번호 */}
          {needsPhone && (
            <View style={s.fieldWrap}>
              <Text style={s.label}>휴대폰 번호</Text>
              <View style={s.row}>
                <TextInput
                  style={[s.input, { flex: 1 }, isPhoneVerified && s.inputDone]}
                  value={phone}
                  onChangeText={(v) => { setPhone(formatPhoneNumber(v)); setPhoneErr(''); }}
                  placeholder="010-0000-0000"
                  placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad"
                  editable={!isPhoneVerified}
                />
                <TouchableOpacity
                  style={[s.subBtn, isPhoneVerified && s.subBtnDone]}
                  onPress={handleSendOtp}
                  disabled={isPhoneVerified || sendOtpMutate.isPending}
                >
                  <Text style={s.subBtnText}>
                    {isPhoneVerified ? '인증완료' : sendOtpMutate.isPending ? '발송 중...' : otpSent ? '재전송' : '인증요청'}
                  </Text>
                </TouchableOpacity>
              </View>
              {phoneErr ? <Text style={s.errText}>{phoneErr}</Text> : null}

              {otpSent && !isPhoneVerified && (
                <View style={[s.fieldWrap, { marginTop: 8 }]}>
                  <View style={s.row}>
                    <TextInput
                      style={[s.input, { flex: 1 }]}
                      value={otpCode}
                      onChangeText={(v) => { setOtpCode(v.replace(/\D/g, '').slice(0, 6)); setOtpErr(''); }}
                      placeholder="인증번호 6자리"
                      placeholderTextColor="#9ca3af"
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                    <TouchableOpacity
                      style={[s.subBtn, { backgroundColor: '#10b981' }]}
                      onPress={handleVerifyOtp}
                      disabled={verifyOtpMutate.isPending || otpCode.length !== 6}
                    >
                      <Text style={s.subBtnText}>{verifyOtpMutate.isPending ? '확인 중...' : '확인'}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={s.otpMeta}>
                    {otpErr ? <Text style={s.errText}>{otpErr}</Text> : <Text />}
                    <Text style={[s.timer, timeLeft === '00:00' && s.timerExpired]}>{timeLeft}</Text>
                  </View>
                </View>
              )}
              {isPhoneVerified && <Text style={s.okText}>✓ 휴대폰 인증이 완료되었습니다.</Text>}
            </View>
          )}

          <TouchableOpacity
            style={[
              s.submitBtn,
              (needsNickname && !isNicknameVerified) || (needsPhone && !isPhoneVerified)
                ? s.submitBtnDisabled : {},
            ]}
            onPress={handleSignUp}
            disabled={
              oauthSignUpMutate.isPending ||
              (needsNickname && !isNicknameVerified) ||
              (needsPhone && !isPhoneVerified)
            }
          >
            <Text style={s.submitBtnText}>
              {oauthSignUpMutate.isPending ? '처리 중...' : '번개분양 시작하기 ⚡'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.replace('/auth/login')} style={s.cancelBtn}>
            <Text style={s.cancelText}>로그인 취소하기</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return null;
}

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#f9fafb', alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { fontSize: 16, fontWeight: '700', color: '#374151' },
  container: { flexGrow: 1, backgroundColor: '#f9fafb', paddingHorizontal: 24 },
  headerWrap: { alignItems: 'center', marginBottom: 28 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#111827', marginBottom: 6 },
  headerSub: { fontSize: 13, color: '#ef4444', textAlign: 'center', fontWeight: '500' },
  fieldWrap: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  row: { flexDirection: 'row', gap: 8 },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    backgroundColor: '#fff', color: '#111827',
  },
  inputDone: { backgroundColor: '#f3f4f6', borderColor: '#e5e7eb' },
  subBtn: {
    backgroundColor: '#6366f1', borderRadius: 12, paddingHorizontal: 14,
    alignItems: 'center', justifyContent: 'center', minWidth: 80,
  },
  subBtnDone: { backgroundColor: '#9ca3af' },
  subBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  errText: { fontSize: 12, color: '#ef4444', marginTop: 4 },
  okText: { fontSize: 12, color: '#10b981', marginTop: 4, fontWeight: '500' },
  otpMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  timer: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  timerExpired: { color: '#ef4444' },
  submitBtn: {
    backgroundColor: '#FEE500', paddingVertical: 16, borderRadius: 14,
    alignItems: 'center', marginTop: 8,
  },
  submitBtnDisabled: { backgroundColor: '#e5e7eb' },
  submitBtnText: { color: '#191919', fontWeight: '800', fontSize: 16 },
  cancelBtn: { alignItems: 'center', marginTop: 16 },
  cancelText: { fontSize: 13, color: '#9ca3af', textDecorationLine: 'underline' },
});
