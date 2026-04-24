import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCheckLoginId, useCheckNickname, useSendOtp, useVerifyOtp, useSignUp } from '@/services/auth/mutations';
import { getOrCreateDeviceId } from '@/api/apiClient';
import * as Haptics from 'expo-haptics';

// ── 유틸 함수 (백엔드 연결 전 더미) ──────────────────────────
const validateId = (v: string) => /^[a-zA-Z0-9_]+$/.test(v);
const validatePassword = (v: string) => v.length >= 8;
const validatePhone = (v: string) => /^[0-9]{10,11}$/.test(v.replace(/-/g, ''));
const validateLetter = (v: string) => /^[가-힣a-zA-Z0-9]+$/.test(v);
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

// ── 공통 입력 컴포넌트 ──────────────────────────────────────
interface FieldProps {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: any;
  editable?: boolean;
  onBlur?: () => void;
  error?: string | null;
  success?: string | null;
  rightElement?: React.ReactNode;
  autoCapitalize?: any;
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = 'default',
  editable = true,
  onBlur,
  error,
  success,
  rightElement,
  autoCapitalize = 'none',
}: FieldProps) {
  return (
    <View style={styles.fieldWrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputRow, !editable && styles.inputDisabled]}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          editable={editable}
          onBlur={onBlur}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
        />
        {rightElement}
      </View>
      {error ? <Text style={styles.errorText}>⚠️ {error}</Text> : null}
      {!error && success ? <Text style={styles.successText}>✓ {success}</Text> : null}
    </View>
  );
}

// ── 메인 페이지 ─────────────────────────────────────────────
export default function RegisterPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [form, setForm] = useState({
    loginId: '',
    name: '',
    nickname: '',
    phone: '',
    otpCode: '',
    password: '',
    passwordCheck: '',
  });

  const setField = (key: keyof typeof form) => (val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const setError = (key: string, msg: string | null) =>
    setErrors((prev) => ({ ...prev, [key]: msg }));

  const checkLoginIdMutate = useCheckLoginId();
  const checkNicknameMutate = useCheckNickname();
  const sendOtpMutate = useSendOtp();
  const verifyOtpMutate = useVerifyOtp();
  const signUpMutate = useSignUp();
  const [isLoginIdVerified, setIsLoginIdVerified] = useState(false);
  const [isNicknameVerified, setIsNicknameVerified] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [timeLeft, setTimeLeft] = useState('03:00');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const otpHeight = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(otpHeight, {
      toValue: isOtpSent ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isOtpSent]);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft('03:00');
    let left = 180;
    timerRef.current = setInterval(() => {
      left -= 1;
      setTimeLeft(formatTime(left));
      if (left <= 0) {
        clearInterval(timerRef.current!);
        setIsOtpSent(false);
        setIsOtpVerified(false);
        setField('otpCode')('');
      }
    }, 1000);
  };

  // ── 핸들러 ───────────────────────────────────────────────
  const handleLoginIdBlur = () => {
    if (!form.loginId) return;
    if (!validateId(form.loginId)) {
      setError('loginId', '아이디는 영어, 숫자, 언더바만 사용 가능합니다.');
      setIsLoginIdVerified(false);
      return;
    }
    checkLoginIdMutate.mutate(form.loginId, {
      onSuccess: () => {
        setError('loginId', null);
        setIsLoginIdVerified(true);
      },
      onError: (err: any) => {
        const status = err.response?.status;
        const errorCode = err.response?.data?.errorCode;
        if (status === 409 && errorCode === '10003') {
          setError('loginId', '이미 사용 중인 아이디입니다.');
        } else {
          setError('loginId', '아이디 중복 확인 중 오류가 발생했습니다.');
        }
        setIsLoginIdVerified(false);
      },
    });
  };

  const handleNicknameBlur = () => {
    if (!form.nickname.trim() || form.nickname.length < 2) return;
    checkNicknameMutate.mutate(form.nickname, {
      onSuccess: () => {
        setError('nickname', null);
        setIsNicknameVerified(true);
      },
      onError: (err: any) => {
        const status = err.response?.status;
        const errorCode = err.response?.data?.errorCode;
        if (status === 409 && errorCode === '10004') {
          setError('nickname', '이미 사용 중인 닉네임입니다.');
        } else {
          setError('nickname', '닉네임 중복 확인 중 오류가 발생했습니다.');
        }
        setIsNicknameVerified(false);
      },
    });
  };

  const handleSendOtp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!validatePhone(form.phone)) {
      setError('phone', '올바른 휴대폰 번호를 입력해주세요.');
      return;
    }
    setError('phone', null);
    const purePhone = form.phone.replace(/-/g, '');
    sendOtpMutate.mutate(purePhone, {
      onSuccess: () => {
        setIsOtpSent(true);
        startTimer();
      },
      onError: (err: any) => {
        setError('phone', err.response?.data?.message ?? '인증번호 발송에 실패했습니다.');
      },
    });
  };

  const handleVerifyOtp = () => {
    if (!form.otpCode) {
      setError('otp', '인증번호를 입력해주세요.');
      return;
    }
    const purePhone = form.phone.replace(/-/g, '');
    verifyOtpMutate.mutate({ phone: purePhone, otpCode: form.otpCode }, {
      onSuccess: () => {
        setIsOtpVerified(true);
        setIsOtpSent(false);
        setError('otp', null);
        setError('phone', null);
        setField('otpCode')('');
        if (timerRef.current) clearInterval(timerRef.current);
      },
      onError: (err: any) => {
        setError('otp', err.response?.data?.message ?? '인증번호가 올바르지 않습니다.');
      },
    });
  };

  const handleSubmit = async () => {
    const newErrors: Record<string, string | null> = {
      loginId: !form.loginId ? '아이디를 입력해주세요.' : !isLoginIdVerified ? '아이디 중복 확인이 필요합니다.' : null,
      name: !form.name.trim() ? '이름을 입력해주세요.' : null,
      nickname: !form.nickname.trim() ? '닉네임을 입력해주세요.' : !isNicknameVerified ? '닉네임 중복 확인이 필요합니다.' : null,
      phone: !form.phone ? '전화번호를 입력해주세요.' : !isOtpVerified ? '휴대폰 인증을 완료해주세요.' : null,
      password: !form.password ? '비밀번호를 입력해주세요.' : !validatePassword(form.password) ? '비밀번호는 8자리 이상이어야 합니다.' : null,
      passwordCheck: form.password !== form.passwordCheck ? '비밀번호가 일치하지 않습니다.' : null,
    };
    setErrors(newErrors);
    if (Object.values(newErrors).some(Boolean)) return;

    const deviceId = await getOrCreateDeviceId();
    signUpMutate.mutate(
      {
        loginId: form.loginId,
        name: form.name.trim(),
        nickname: form.nickname.trim(),
        phone: form.phone.replace(/-/g, ''),
        password: form.password,
        deviceId,
        joinRoutes: 'app',
      },
      {
        onSuccess: () => router.replace('/'),
        onError: (err: any) => {
          setError('loginId', err.response?.data?.message ?? '회원가입 중 오류가 발생했습니다.');
        },
      },
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* 로고 */}
        <View style={styles.logoWrap}>
          <TouchableOpacity onPress={() => router.push('/')}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <Text style={styles.title}>회원가입</Text>
          <Text style={styles.subtitle}>번개분양의 새로운 가족이 되어주세요!</Text>
        </View>

        {/* 폼 */}
        <View style={styles.form}>

          {/* 아이디 */}
          <Field
            label="아이디"
            value={form.loginId}
            onChangeText={(v) => {
              setField('loginId')(v);
              setIsLoginIdVerified(false);
              setError('loginId', v && !validateId(v) ? '아이디는 영어, 숫자, 언더바만 사용 가능합니다.' : null);
            }}
            onBlur={handleLoginIdBlur}
            placeholder="아이디를 입력해주세요."
            error={errors.loginId}
            success={isLoginIdVerified ? '사용 가능한 아이디입니다.' : null}
          />

          {/* 이름 */}
          <Field
            label="이름"
            value={form.name}
            onChangeText={(v) => {
              setField('name')(v);
              setError('name', v && !validateLetter(v) ? '이름은 한글, 영문, 숫자만 입력 가능합니다.' : null);
            }}
            placeholder="이름을 입력해주세요."
            error={errors.name}
          />

          {/* 닉네임 */}
          <Field
            label="닉네임"
            value={form.nickname}
            onChangeText={(v) => {
              setField('nickname')(v);
              setIsNicknameVerified(false);
              setError('nickname', v.length > 0 && v.length < 2 ? '닉네임은 2글자 이상이어야 합니다.' : null);
            }}
            onBlur={handleNicknameBlur}
            placeholder="닉네임을 입력해주세요."
            error={errors.nickname}
            success={isNicknameVerified ? '사용 가능한 닉네임입니다.' : null}
          />

          {/* 휴대폰 */}
          <Field
            label="휴대폰 번호"
            value={form.phone}
            onChangeText={(v) => setField('phone')(formatPhoneNumber(v))}
            placeholder="휴대전화번호를 입력해주세요."
            keyboardType="phone-pad"
            editable={!isOtpVerified}
            error={errors.phone}
            success={isOtpVerified ? '인증이 완료되었습니다.' : null}
            rightElement={
              <TouchableOpacity
                style={[styles.inlineBtn, isOtpVerified && styles.inlineBtnDone]}
                onPress={handleSendOtp}
                disabled={isOtpVerified}
              >
                <Text style={styles.inlineBtnText}>
                  {isOtpVerified ? '인증완료' : isOtpSent ? '재전송' : '인증요청'}
                </Text>
              </TouchableOpacity>
            }
          />

          {/* 인증번호 (애니메이션) */}
          <Animated.View
            style={{
              maxHeight: otpHeight.interpolate({ inputRange: [0, 1], outputRange: [0, 120] }),
              opacity: otpHeight,
              overflow: 'hidden',
            }}
          >
            <View style={styles.fieldWrap}>
              <Text style={[styles.label, { color: '#6366f1' }]}>인증번호</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={form.otpCode}
                  onChangeText={setField('otpCode')}
                  placeholder="6자리 숫자"
                  placeholderTextColor="#9ca3af"
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <TouchableOpacity style={styles.inlineBtn} onPress={handleVerifyOtp}>
                  <Text style={styles.inlineBtnText}>확인</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.otpFooter}>
                {errors.otp ? <Text style={styles.errorText}>⚠️ {errors.otp}</Text> : <View />}
                <Text style={styles.timerText}>남은 시간 : {timeLeft}</Text>
              </View>
            </View>
          </Animated.View>

          {/* 비밀번호 */}
          <Field
            label="비밀번호"
            value={form.password}
            onChangeText={(v) => {
              setField('password')(v);
              setError('password', v && !validatePassword(v) ? '비밀번호는 8자리 이상이어야 합니다.' : null);
            }}
            placeholder="8자리 이상 입력해주세요."
            secureTextEntry
            error={errors.password}
          />

          {/* 비밀번호 확인 */}
          <Field
            label="비밀번호 확인"
            value={form.passwordCheck}
            onChangeText={(v) => {
              setField('passwordCheck')(v);
              setError('passwordCheck', v && v !== form.password ? '비밀번호가 일치하지 않습니다.' : null);
            }}
            placeholder="비밀번호를 재입력해주세요."
            secureTextEntry
            error={errors.passwordCheck}
          />
        </View>

        {/* 가입하기 버튼 */}
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.85}>
          <Text style={styles.submitBtnText}>가입하기</Text>
        </TouchableOpacity>

        {/* 로그인 링크 */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>이미 계정이 있으신가요? </Text>
          <TouchableOpacity onPress={() => router.push('/auth/login')}>
            <Text style={styles.footerLink}>로그인하기</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 24,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logo: {
    width: 160,
    height: 56,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  form: {
    gap: 4,
  },
  fieldWrap: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 2,
  },
  inputDisabled: {
    backgroundColor: '#f3f4f6',
  },
  input: {
    fontSize: 15,
    color: '#111827',
    paddingVertical: 12,
  },
  inlineBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginLeft: 8,
  },
  inlineBtnDone: {
    backgroundColor: '#9ca3af',
  },
  inlineBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
    paddingLeft: 4,
  },
  successText: {
    fontSize: 12,
    color: '#6366f1',
    marginTop: 4,
    paddingLeft: 4,
  },
  otpFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  timerText: {
    fontSize: 13,
    color: '#ef4444',
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: '#6366f1',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 13,
    color: '#6b7280',
  },
  footerLink: {
    fontSize: 13,
    color: '#6366f1',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
