import { useEffect, useRef, useState } from 'react';
import {
  Modal, View, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Linking, Platform,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation } from 'react-native-webview';
// ShouldStartLoadRequest는 패키지 최상위로 re-export되지 않아 하위 경로에서 가져온다.
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';
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
  const [returned, setReturned] = useState(false); // returnurl 진입 여부 (grace 유예 계산용)
  const [polling, setPolling] = useState(false);
  const finishedRef = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ticksRef = useRef(0);
  const graceRef = useRef(0);

  // 모달이 열리는 즉시 폴링 시작 — 웹뷰 내부 X(=PayApp HTML의 닫기 버튼)로 return URL 을 건너뛰는
  // 케이스가 있어서, return URL 도달 여부와 무관하게 서버 상태를 계속 확인한다.
  // (기존엔 return URL 도달해야 폴링이 켜져 결제 유실이 발생했음)
  useEffect(() => {
    if (visible && orderId) {
      finishedRef.current = false;
      ticksRef.current = 0;
      graceRef.current = 0;
      setReturned(false);
      startPolling();
    } else {
      stopPolling();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, orderId]);

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
    // returnurl 진입 감지 → grace 유예 카운트 시작 트리거.
    // (폴링 자체는 모달 오픈 시점부터 이미 돌고 있으므로 여기서 startPolling 호출은 불필요)
    if (nav.url.includes(RETURN_URL_MARKER) && !returned) {
      setReturned(true);
    }
  };

  // intent://HOST/PATH?query#Intent;scheme=xxx;package=yyy;...;end 형태를 파싱.
  // React Native Linking은 Uri.parse()만 써서 intent:// 를 못 다룸 → 직접 파싱해 scheme://... 로 변환.
  const parseIntentUrl = (intentUrl: string) => {
    const m = intentUrl.match(/^intent:\/\/([\s\S]*?)#Intent;([\s\S]*?);end/i);
    if (!m) return null;
    const path = m[1];
    const params: Record<string, string> = {};
    for (const p of m[2].split(';')) {
      const idx = p.indexOf('=');
      if (idx <= 0) continue;
      params[p.slice(0, idx)] = p.slice(idx + 1);
    }
    const scheme = params.scheme;
    const pkg = params.package;
    let fallback: string | undefined;
    try {
      fallback = params['S.browser_fallback_url'] ? decodeURIComponent(params['S.browser_fallback_url']) : undefined;
    } catch { /* noop */ }
    return {
      targetUrl: scheme ? `${scheme}://${path}` : null,
      packageName: pkg || null,
      fallbackUrl: fallback || null,
    };
  };

  // intent:// URL을 처리.
  // 1) scheme://path 로 변환해 앱 실행 시도  2) 실패면 market://details?id=xxx  3) 그래도 실패면 browser_fallback_url
  const openIntentUrl = async (url: string) => {
    const parsed = parseIntentUrl(url);
    console.log('[Payapp] parseIntentUrl:', parsed);
    if (!parsed) {
      Linking.openURL(url).catch((err) => console.log('[Payapp] raw intent openURL failed:', err?.message));
      return;
    }
    const { targetUrl, packageName, fallbackUrl } = parsed;

    // 1) scheme://path 로 앱 실행
    if (targetUrl) {
      try {
        await Linking.openURL(targetUrl);
        console.log('[Payapp] targetUrl 실행 성공:', targetUrl);
        return;
      } catch (err: any) {
        console.log('[Payapp] targetUrl 실행 실패:', err?.message, targetUrl);
      }
    }

    // 2) Play Store로 유도 (앱 미설치)
    if (packageName && Platform.OS === 'android') {
      try {
        await Linking.openURL(`market://details?id=${packageName}`);
        console.log('[Payapp] market 이동:', packageName);
        return;
      } catch (err: any) {
        console.log('[Payapp] market 실행 실패:', err?.message);
      }
    }

    // 3) 그래도 안 되면 browser_fallback_url
    if (fallbackUrl) {
      try {
        await Linking.openURL(fallbackUrl);
        console.log('[Payapp] fallbackUrl 이동:', fallbackUrl);
        return;
      } catch (err: any) {
        console.log('[Payapp] fallbackUrl 실행 실패:', err?.message);
      }
    }

    Alert.alert('앱 실행 실패', '결제에 필요한 앱을 열 수 없습니다.');
  };

  // 카드사/은행/카톡페이 등 외부 앱 스킴을 인터셉트해 Linking으로 넘긴다.
  // WebView 자체는 http(s)만 로드하고, intent:// / kakao:// / ispmobile:// 등은 OS가 처리.
  const handleShouldStartLoad = (req: ShouldStartLoadRequest): boolean => {
    const url = req.url;
    if (!url) return true;
    console.log('[Payapp] shouldStartLoad:', url);

    if (/^(https?|about|data|blob):/.test(url)) return true;

    if (Platform.OS === 'android' && url.startsWith('intent://')) {
      openIntentUrl(url);
      return false;
    }

    Linking.openURL(url).catch((err) => {
      console.log('[Payapp] scheme openURL failed:', err?.message, url);
      Alert.alert('앱 실행 실패', '결제에 필요한 앱을 열 수 없습니다. 설치 여부를 확인해 주세요.');
    });
    return false;
  };

  // Android에서 커스텀 스킴이 onShouldStartLoadWithRequest 를 안 거치고 바로 에러로 빠지는 케이스 폴백.
  // ERR_UNKNOWN_URL_SCHEME(-10) 등이 발생하면 nativeEvent.url 을 꺼내 직접 Linking으로 위임.
  const handleError = (event: { nativeEvent: { url?: string; description?: string; code?: number } }) => {
    const { url, description, code } = event.nativeEvent;
    console.log('[Payapp] WebView error:', code, description, url);
    if (!url) return;
    if (/^(https?|about|data|blob):/.test(url)) return; // 진짜 네트워크 에러
    if (Platform.OS === 'android' && url.startsWith('intent://')) {
      openIntentUrl(url);
      return;
    }
    Linking.openURL(url).catch(() => {
      Alert.alert('앱 실행 실패', '결제에 필요한 앱을 열 수 없습니다. 설치 여부를 확인해 주세요.');
    });
  };

  const handleClose = async () => {
    if (!orderId) {
      finish('cancelled');
      return;
    }
    // A: 웹뷰 내부 X 로 return URL 을 건너뛰거나, 폴링 tick 사이에 X 를 눌러도
    //    결제가 유실되지 않도록 항상 서버 최종 상태를 조회한 뒤 결정한다.
    setReturned(true); // "결제 확인 중" 오버레이가 뜨도록 트리거
    try {
      const s = await getPayappStatus(orderId);
      if (s.status === 'paid') return finish('paid');
      if (s.status === 'cancelled' || s.status === 'expired') return finish('cancelled');
      // pending — 웹훅이 아직 서버에 안 온 상태. 사용자에게 안내 후 취소 처리.
      Alert.alert(
        '결제 확인 지연',
        '결제 확인이 지연되고 있습니다. 결제가 완료됐다면 잠시 후 "내 공고"에서 확인해 주세요.',
        [{ text: '확인', onPress: () => finish('cancelled') }],
      );
    } catch {
      finish('cancelled');
    }
  };

  if (!visible || !payurl) return null;

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={handleClose}>
      <View style={[s.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
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
            onShouldStartLoadWithRequest={handleShouldStartLoad}
            onError={handleError}
            onHttpError={(e) => console.log('[Payapp] http error:', e.nativeEvent.statusCode, e.nativeEvent.url)}
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
            // 모든 origin 허용 + 커스텀 스킴을 handleShouldStartLoad에서 인터셉트
            originWhitelist={['*']}
            // 새창(target=_blank)으로 열리는 링크도 같은 WebView에서 처리
            setSupportMultipleWindows={false}
          />

          {/* 폴링 오버레이 — returnurl 진입(또는 X 누른 후 최종 조회) 시점에만 표시.
              폴링 자체는 모달 오픈 시점부터 돌지만, 이 시점에 오버레이를 띄우면
              사용자가 결제창을 볼 수 없다. returned = true 이후에만 노출한다. */}
          {polling && returned && (
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
