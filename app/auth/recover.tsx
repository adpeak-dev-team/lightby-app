import { View, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { Text } from '@/components/common/AppText';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRecoverAccount, useDiscardWithdrawnAccount } from '@/services/auth/mutations';
import { getOrCreateDeviceId } from '@/api/apiClient';
import { getPreferences } from '@/services/user/api';
import { toast } from '@/hooks/use-toast';

// 탈퇴 유예 기간(14일) 내 계정으로 로그인했을 때 진입하는 화면.
// login/kakao/apple 화면이 서버 응답(isWithdrawnUser)을 받아 params로 넘겨준다.
// 웹(lightby-front/src/app/auth/recover)은 sessionStorage를 쓰지만, 앱은 라우터 params가
// 더 자연스럽고 화면을 벗어나면 recoveryToken이 함께 사라져서 남지 않는다.
type RecoverSource = 'local' | 'kakao' | 'apple';

export default function RecoverPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    userId?: string;
    recoveryToken?: string;
    deletedAt?: string;
    expiresAt?: string;
    source?: string;
  }>();

  const recoverMutate = useRecoverAccount();
  const discardMutate = useDiscardWithdrawnAccount();
  const isBusy = recoverMutate.isPending || discardMutate.isPending;

  const userId = Number(params.userId);
  const recoveryToken = params.recoveryToken ?? '';
  const source = (params.source ?? 'local') as RecoverSource;

  const goLogin = () => router.replace('/auth/login');

  // 컨텍스트 없이 직접 진입한 경우(딥링크 등) — 복구할 대상이 없으므로 로그인으로 돌려보낸다.
  if (!userId || Number.isNaN(userId) || !recoveryToken) {
    return (
      <View style={[s.container, s.centered]}>
        <Text style={s.emptyText}>복구 정보를 찾을 수 없습니다.</Text>
        <TouchableOpacity onPress={goLogin} style={s.emptyBtn}>
          <Text style={s.emptyBtnText}>로그인 화면으로</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 날짜 표기 — 값이 없거나 깨져 있어도 화면이 죽지 않게 방어한다.
  const deletedAt = params.deletedAt ? new Date(params.deletedAt) : null;
  const expiresAt = params.expiresAt ? new Date(params.expiresAt) : null;
  const isValid = (d: Date | null): d is Date => !!d && !Number.isNaN(d.getTime());

  const deletedAtLabel = isValid(deletedAt)
    ? `${deletedAt.getFullYear()}. ${deletedAt.getMonth() + 1}. ${deletedAt.getDate()}.`
    : '-';
  const daysLeft = isValid(expiresAt)
    ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const handleRecover = async () => {
    if (isBusy) return;
    const deviceId = await getOrCreateDeviceId();
    recoverMutate.mutate(
      { userId, recoveryToken, deviceId },
      {
        onSuccess: async (data) => {
          if (data.needsPhoneAuth) {
            toast.info('복구되었습니다. 휴대폰 인증이 필요합니다.');
            router.replace({ pathname: '/auth/phoneauth', params: { userId: String(data.id) } });
            return;
          }
          toast.success('계정이 복구되었습니다.');
          // 로그인 흐름과 동일하게 관심설정이 비어있으면 설정 화면으로 보낸다.
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
          Alert.alert(
            '복구에 실패했습니다.',
            err?.response?.data?.message ?? '잠시 후 다시 시도해주세요.',
            [{ text: '확인', onPress: goLogin }],
          );
        },
      },
    );
  };

  const handleDiscard = () => {
    if (isBusy) return;
    Alert.alert(
      '기존 계정을 완전히 파기합니다.',
      '이후에는 복구할 수 없습니다. 새 계정으로 다시 가입하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '파기하고 새로 가입',
          style: 'destructive',
          onPress: () => {
            discardMutate.mutate(
              { userId, recoveryToken },
              {
                onSuccess: () => {
                  toast.info('기존 계정이 파기되었습니다. 새로 가입해주세요.');
                  // 소셜 로그인이었다면 해당 소셜부터 다시 시작해야 신규 가입 흐름을 탄다.
                  router.replace(source === 'local' ? '/auth/register' : '/auth/login');
                },
                onError: (err: any) => {
                  // recoveryToken은 일회용이라 실패 시점에 이미 소비됐거나 만료됐을 수 있다.
                  // 이 화면에 남겨두면 다시 눌러도 계속 실패하므로 로그인부터 다시 태운다.
                  Alert.alert(
                    '요청에 실패했습니다.',
                    err?.response?.data?.message ?? '잠시 후 다시 시도해주세요.',
                    [{ text: '확인', onPress: goLogin }],
                  );
                },
              },
            );
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={[s.scroll, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}
    >
      <View style={s.card}>
        <View style={s.header}>
          <View style={s.iconCircle}>
            <Text style={s.iconText}>⚡</Text>
          </View>
          <Text style={s.title}>탈퇴한 계정입니다</Text>
          <Text style={s.subtitle}>아직 유예 기간이 남아 있어 복구할 수 있어요.</Text>
        </View>

        <View style={s.infoBox}>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>탈퇴 신청일</Text>
            <Text style={s.infoValue}>{deletedAtLabel}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>복구 가능 기한</Text>
            <Text style={s.infoValueAccent}>
              {daysLeft === null ? '-' : `${daysLeft}일 남음`}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[s.primaryBtn, isBusy && s.primaryBtnDisabled]}
          onPress={handleRecover}
          disabled={isBusy}
        >
          <Text style={s.primaryBtnText}>
            {recoverMutate.isPending ? '복구 중...' : '계정 복구하기'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.secondaryBtn, isBusy && s.secondaryBtnDisabled]}
          onPress={handleDiscard}
          disabled={isBusy}
        >
          <Text style={s.secondaryBtnText}>
            {discardMutate.isPending ? '처리 중...' : '새 계정으로 가입할래요'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={goLogin} disabled={isBusy} style={s.cancelBtn}>
          <Text style={s.cancelText}>취소하고 로그인 화면으로</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  centered: { justifyContent: 'center', alignItems: 'center', gap: 16 },
  emptyText: { fontSize: 15, color: '#64748b', fontWeight: '600' },
  emptyBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: '#3b82f6' },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 28,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  header: { alignItems: 'center', marginBottom: 28 },
  iconCircle: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#fef9c3',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  iconText: { fontSize: 24 },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 8, textAlign: 'center' },

  infoBox: {
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 12, padding: 18, gap: 10, marginBottom: 24,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 13, color: '#475569' },
  infoValue: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  infoValueAccent: { fontSize: 13, fontWeight: '700', color: '#2563eb' },

  primaryBtn: {
    backgroundColor: '#3b82f6', paddingVertical: 16,
    borderRadius: 12, alignItems: 'center',
  },
  primaryBtnDisabled: { backgroundColor: '#93c5fd' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 17 },

  secondaryBtn: {
    marginTop: 12, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
    borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#fff',
  },
  secondaryBtnDisabled: { opacity: 0.5 },
  secondaryBtnText: { color: '#475569', fontWeight: '600', fontSize: 14 },

  cancelBtn: { marginTop: 16, alignItems: 'center' },
  cancelText: { fontSize: 12, color: '#94a3b8', textDecorationLine: 'underline' },
});
