import { useEffect, useRef, useState } from 'react';
import {
  Modal, View, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { getPayappStatus } from '@/services/payapp/api';

interface Props {
  visible: boolean;
  payurl: string | null;
  orderId: string | null;
  onSuccess: () => void;   // 결제 확정 (paid) — 호출부에서 후속 처리
  onCancel: () => void;    // 사용자 취소 or 결제 실패
  onDismiss: () => void;   // 모달 닫힘(성공/취소/타임아웃 어느 경우든)
}

// PayApp returnurl 은 CLIENT_URL/payment/payapp/return?orderId=xxx 형태.
// 웹뷰가 이 경로로 이동하는 걸 감지해 결제창을 닫고 폴링을 시작한다.
const RETURN_URL_MARKER = '/payment/payapp/return';

// 폴링 파라미터 — 웹과 동일한 감각(2초 간격 + 5분 상한 + 복귀 후 유예)
const POLL_INTERVAL_MS = 2000;
const MAX_TICKS = 150;      // 총 상한 약 5분
const GRACE_LIMIT = 8;      // returnurl 복귀 후 웹훅 대기 약 16초

export function PayappWebViewModal({ visible, payurl, orderId, onSuccess, onCancel, onDismiss }: Props) {
  const insets = useSafeAreaInsets();
  const [returned, setReturned] = useState(false); // returnurl 진입 여부
  const [polling, setPolling] = useState(false);
  const finishedRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ticksRef = useRef(0);
  const graceRef = useRef(0);

  // 모달 새로 열릴 때 상태 초기화
  useEffect(() => {
    if (visible) {
      finishedRef.current = false;
      ticksRef.current = 0;
      graceRef.current = 0;
      setReturned(false);
      setPolling(false);
    } else {
      stopPolling();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setPolling(false);
  };

  const finish = (result: 'paid' | 'cancelled' | 'timeout') => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    stopPolling();

    if (result === 'paid') {
      onSuccess();
    } else if (result === 'cancelled') {
      onCancel();
    } else {
      // timeout: 알림톡/카톡 확인 유도. 실제 결제는 웹훅으로 뒤늦게 확정될 수 있음.
      Alert.alert('결제 확인 지연', '결제 확인이 지연되고 있습니다. 잠시 후 내 공고에서 확인해 주세요.');
      onCancel();
    }
    onDismiss();
  };

  const startPolling = () => {
    if (!orderId || pollTimerRef.current) return;
    setPolling(true);
    pollTimerRef.current = setInterval(async () => {
      ticksRef.current += 1;
      try {
        const s = await getPayappStatus(orderId);
        if (s.status === 'paid') return finish('paid');
        if (s.status === 'cancelled' || s.status === 'expired') return finish('cancelled');
      } catch {
        // 폴링 일시 실패는 무시
      }
      if (returned) {
        graceRef.current += 1;
        if (graceRef.current >= GRACE_LIMIT) return finish('cancelled');
      }
      if (ticksRef.current >= MAX_TICKS) return finish('timeout');
    }, POLL_INTERVAL_MS);
  };

  const handleNavChange = (nav: WebViewNavigation) => {
    if (!nav?.url) return;
    // returnurl 진입 감지 → 폴링 시작.
    // 결제 취소/뒤로가기로 returnurl 안 거치고 종료하는 케이스는 사용자가 X 버튼을 눌러 취소하는 흐름으로 대응.
    if (nav.url.includes(RETURN_URL_MARKER)) {
      if (!returned) {
        setReturned(true);
        startPolling();
      }
    }
  };

  const handleClose = () => {
    if (returned && polling) {
      // 결제 완료 후 폴링 중이면 그냥 창만 닫지 않고 취소 처리
      finish('cancelled');
      return;
    }
    // 결제 시작도 안 했으면 그냥 취소
    finish('cancelled');
  };

  if (!visible || !payurl) return null;

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={handleClose}>
      <View style={[s.container, { paddingTop: insets.top }]}>
        {/* 헤더 */}
        <View style={s.header}>
          <Text style={s.title}>결제 진행</Text>
          <TouchableOpacity onPress={handleClose} hitSlop={10} style={s.closeBtn}>
            <Ionicons name="close" size={26} color="#334155" />
          </TouchableOpacity>
        </View>

        {/* WebView — 결제창 */}
        <View style={{ flex: 1 }}>
          <WebView
            source={{ uri: payurl }}
            onNavigationStateChange={handleNavChange}
            startInLoadingState
            renderLoading={() => (
              <View style={s.loading}>
                <ActivityIndicator size="large" color="#10b981" />
              </View>
            )}
            javaScriptEnabled
            domStorageEnabled
            thirdPartyCookiesEnabled
            sharedCookiesEnabled
            originWhitelist={['*']}
            // PayApp 결제 페이지가 카드사/은행 앱스킴을 자주 호출한다 → 허용 (Android 필수)
            setSupportMultipleWindows={false}
          />

          {/* 폴링 오버레이 — returnurl 진입 후 결제 확정 대기 */}
          {polling && (
            <View style={s.overlay}>
              <ActivityIndicator size="large" color="#10b981" />
              <Text style={s.overlayText}>결제 확인 중입니다...</Text>
              <Text style={s.overlaySub}>잠시만 기다려 주세요.</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  title: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  closeBtn: { padding: 4 },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    gap: 12,
  },
  overlayText: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  overlaySub: { fontSize: 13, color: '#64748b' },
});
