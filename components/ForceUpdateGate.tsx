import { useEffect, useState } from 'react';
import {
    Modal, View, TouchableOpacity, StyleSheet, Platform, Linking,
} from 'react-native';
import * as Application from 'expo-application';

// 시스템 글꼴 배율을 따라가지 않는 공용 Text(allowFontScaling=false).
// 이 모달은 카드 높이가 고정이라 배율이 커지면 글자가 잘린다.
import { Text } from '@/components/common/AppText';

import { fetchAppVersionConfig } from '@/services/app-update/api';
import { isBelow } from '@/services/app-update/version';

// 네이티브 모듈(sp-react-native-in-app-updates)은 EAS 재빌드 후에만 존재한다.
// 현재 dev 빌드처럼 모듈이 없으면 require가 던지므로, 없을 땐 스토어 링크 폴백으로 동작.
let SpInAppUpdates: any = null;
let IAUUpdateKind: any = null;
try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('sp-react-native-in-app-updates');
    SpInAppUpdates = mod?.default ?? mod?.SpInAppUpdates ?? null;
    IAUUpdateKind = mod?.IAUUpdateKind ?? null;
} catch {
    // 네이티브 미포함 → 아래 블로킹 모달 + 스토어 링크로 폴백
}

/**
 * 강제 업데이트 게이트. RootLayout에서 한 번 렌더한다.
 * - 부팅 시 백엔드 기준(min_supported_version)과 현재 앱 버전을 비교.
 * - 미달이면: Android는 Play 임베디드 IMMEDIATE 강제 업데이트, iOS는 닫을 수 없는 모달 → App Store.
 * - 설정 조회 실패 시엔 강제하지 않는다(fail-open) — 서버 장애로 앱이 막히면 안 됨.
 */
export function ForceUpdateGate() {
    const [blocked, setBlocked] = useState(false);
    const [storeUrl, setStoreUrl] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                if (Platform.OS === 'web') return;
                const cfg = await fetchAppVersionConfig();
                const platform = Platform.OS === 'ios' ? 'ios' : 'android';
                const current = Application.nativeApplicationVersion ?? '0.0.0';
                const min = cfg.minSupported?.[platform] ?? '0.0.0';
                if (!isBelow(current, min)) return; // 충분히 최신 → 통과

                if (!mounted) return;
                setStoreUrl(cfg.storeUrl?.[platform] ?? null);

                // Android: Play 임베디드 강제 업데이트(앱 안에서 다운로드/설치). 네이티브 있을 때만.
                if (platform === 'android' && SpInAppUpdates && IAUUpdateKind) {
                    try {
                        const inAppUpdates = new SpInAppUpdates(false);
                        const res = await inAppUpdates.checkNeedsUpdate();
                        if (res?.shouldUpdate) {
                            await inAppUpdates.startUpdate({ updateType: IAUUpdateKind.IMMEDIATE });
                            return; // Play 전체화면 강제 UI가 처리(완료 후 앱 재시작)
                        }
                    } catch {
                        // 실패 시 아래 블로킹 모달로 폴백
                    }
                }

                // iOS 또는 Android 폴백: 닫을 수 없는 모달로 차단 → 스토어 이동
                if (mounted) setBlocked(true);
            } catch {
                // 설정 조회 실패 → 강제하지 않음(fail-open)
            }
        })();
        return () => { mounted = false; };
    }, []);

    const openStore = () => {
        if (storeUrl) Linking.openURL(storeUrl).catch(() => { });
    };

    if (!blocked) return null;

    return (
        <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={() => { }}>
            <View style={s.overlay}>
                <View style={s.card}>
                    <Text style={s.title}>업데이트가 필요합니다</Text>
                    <Text style={s.body}>
                        원활한 이용을 위해 최신 버전으로 업데이트해 주세요.{'\n'}
                        업데이트 후 계속 이용하실 수 있습니다.
                    </Text>
                    <TouchableOpacity style={s.btn} onPress={openStore} activeOpacity={0.85}>
                        <Text style={s.btnText}>지금 업데이트</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(15,23,42,0.75)',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 24,
        paddingVertical: 28,
        alignItems: 'center',
    },
    title: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 10 },
    body: { fontSize: 14, lineHeight: 21, color: '#475569', textAlign: 'center', marginBottom: 22 },
    btn: {
        width: '100%',
        height: 52,
        borderRadius: 14,
        backgroundColor: '#3b82f6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
