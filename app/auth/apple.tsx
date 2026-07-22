import {
  View, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderKeyboardOffset } from '@/hooks/use-header-keyboard-offset';
import * as AppleAuthentication from 'expo-apple-authentication';
import { getOrCreateDeviceId } from '@/api/apiClient';
import { useOAuthAppleSignIn, useOAuthSignUp, useCheckNickname, useSendOtp, useVerifyOtp } from '@/services/auth/mutations';
import type { OAuthProfile } from '@/services/auth/api';
import { toast } from '@/hooks/use-toast';
import TermsAgreement from '@/components/common/TermsAgreement';

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

export default function AppleLoginPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { keyboardVerticalOffset } = useHeaderKeyboardOffset();

  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [oauthProfile, setOauthProfile] = useState<OAuthProfile | null>(null);

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

  // 이용약관 동의 (App Store 1.2)
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedAge, setAgreedAge] = useState(false);

  // 회원 탈퇴 시 Apple 토큰 revoke를 위해 서버에 전달할 authorizationCode (로그인/가입 호출에 사용)
  const authorizationCodeRef = useRef<string | undefined>(undefined);

  const appleSignInMutate = useOAuthAppleSignIn();
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
    handleAppleLogin();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const handleAppleLogin = async () => {
    setIsLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error('identityToken 없음');
      }

      // Apple은 최초 1회 로그인에만 이름을 제공한다(한국식: 성 + 이름)
      const fullName = credential.fullName;
      const name = fullName
        ? `${fullName.familyName ?? ''}${fullName.givenName ?? ''}`.trim()
        : '';

      const deviceId = await getOrCreateDeviceId();

      // 탈퇴 시 토큰 revoke용 — 신규 가입 시 회원가입 호출에도 재사용
      authorizationCodeRef.current = credential.authorizationCode ?? undefined;

      appleSignInMutate.mutate(
        { identityToken: credential.identityToken, deviceId, name, authorizationCode: credential.authorizationCode ?? undefined },
        {
          onSuccess: (data) => {
            const profile = data.oauthProfile ?? data.kakaoProfile;
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
            // 시나리오 3: 신규 사용자 (Apple은 닉네임/전화 모두 직접 입력)
            if (data.isNewUser && profile && data.conflicts) {
              setOauthProfile({ ...profile, name: profile.name || name });
              const c = data.conflicts;
              setNeedsNickname(c.isNicknameDuplicate || c.isNicknameMissing);
              setNeedsPhone(c.isPhoneDuplicate || c.isPhoneMissing);
              if (profile.nickname) setNickname(profile.nickname);
              if (profile.phone) setPhone(formatPhoneNumber(profile.phone));
              setShowForm(true);
            }
          },
          onError: (err: any) => {
            console.error('[Apple] 로그인 실패:', err?.response?.data);
            Alert.alert('오류', 'Apple 로그인 중 오류가 발생했습니다.', [
              { text: '확인', onPress: () => router.replace('/auth/login') },
            ]);
          },
          onSettled: () => setIsLoading(false),
        },
      );
    } catch (err: any) {
      setIsLoading(false);
      // 사용자가 취소한 경우는 조용히 로그인 화면으로 복귀
      if (err?.code === 'ERR_REQUEST_CANCELED') {
        router.replace('/auth/login');
        return;
      }
      console.error('[Apple] SDK 오류:', err?.message);
      Alert.alert('오류', 'Apple 로그인을 취소하거나 오류가 발생했습니다.', [
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
    if (!agreedAge) {
      Alert.alert('알림', '만 18세 이상만 가입할 수 있습니다.');
      return;
    }
    if (!agreedTerms) {
      Alert.alert('알림', '이용약관 및 운영정책에 동의해주세요.');
      return;
    }
    if (!oauthProfile) return;

    const deviceId = await getOrCreateDeviceId();
    oauthSignUpMutate.mutate(
      {
        snsId: oauthProfile.snsId,
        snsType: 'APPLE',
        name: oauthProfile.name || (needsNickname ? nickname : oauthProfile.nickname),
        nickname: needsNickname ? nickname : oauthProfile.nickname,
        phone: needsPhone ? phone.replace(/\D/g, '') : (oauthProfile.phone ?? ''),
        profileImage: oauthProfile.profileImage,
        thumbnailImage: oauthProfile.thumbnailImage,
        deviceId,
        authorizationCode: authorizationCodeRef.current,
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
      <View style={s.center}>
        <ActivityIndicator size="large" color="#0f172a" />
        <Text style={s.loadingText}>Apple 로그인 처리 중...</Text>
      </View>
    );
  }

  // 추가 정보 입력 폼
  if (showForm) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={keyboardVerticalOffset}>
        <ScrollView
          contentContainerStyle={[s.container, { paddingTop: 20, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.headerWrap}>
            <Text style={s.headerTitle}>Apple 회원가입</Text>
            <Text style={s.headerSub}>
              {needsNickname && '닉네임 등록이 필요합니다.  '}
              {needsPhone && '전화번호 인증이 필요합니다.'}
            </Text>
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
                  placeholderTextColor="#94a3b8"
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
                  placeholderTextColor="#94a3b8"
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
                      placeholderTextColor="#94a3b8"
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

          {/* 이용약관 동의 (App Store 1.2) */}
          <TermsAgreement checked={agreedTerms} onChange={setAgreedTerms} ageChecked={agreedAge} onAgeChange={setAgreedAge} />

          <TouchableOpacity
            style={[
              s.submitBtn,
              (needsNickname && !isNicknameVerified) || (needsPhone && !isPhoneVerified) || !agreedTerms || !agreedAge
                ? s.submitBtnDisabled : {},
            ]}
            onPress={handleSignUp}
            disabled={
              oauthSignUpMutate.isPending ||
              (needsNickname && !isNicknameVerified) ||
              (needsPhone && !isPhoneVerified) ||
              !agreedTerms ||
              !agreedAge
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
  center: { flex: 1, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { fontSize: 20, fontWeight: '700', color: '#334155' },
  container: { flexGrow: 1, backgroundColor: '#f8fafc', paddingHorizontal: 24 },
  headerWrap: { alignItems: 'center', marginBottom: 28 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  headerSub: { fontSize: 14, color: '#ef4444', textAlign: 'center', fontWeight: '500' },
  fieldWrap: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', color: '#334155', marginBottom: 6 },
  row: { flexDirection: 'row', gap: 8 },
  input: {
    borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14,
    backgroundColor: '#fff', color: '#0f172a',
  },
  inputDone: { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' },
  subBtn: {
    backgroundColor: '#3b82f6', borderRadius: 12, paddingHorizontal: 14,
    alignItems: 'center', justifyContent: 'center', minWidth: 80,
  },
  subBtnDone: { backgroundColor: '#94a3b8' },
  subBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  errText: { fontSize: 12, color: '#ef4444', marginTop: 6 },
  okText: { fontSize: 12, color: '#10b981', marginTop: 6, fontWeight: '600' },
  otpMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  timer: { fontSize: 14, color: '#3b82f6', fontWeight: '700' },
  timerExpired: { color: '#ef4444' },
  submitBtn: {
    backgroundColor: '#0f172a', paddingVertical: 16, borderRadius: 12,
    alignItems: 'center', marginTop: 8,
  },
  submitBtnDisabled: { backgroundColor: '#94a3b8' },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  cancelBtn: { alignItems: 'center', marginTop: 16 },
  cancelText: { fontSize: 14, color: '#64748b', textDecorationLine: 'underline' },
});
