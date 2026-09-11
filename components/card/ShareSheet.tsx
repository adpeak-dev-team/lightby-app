import { useState } from 'react';
import { WEB_URL } from '@/lib/constants';
import {
    Modal, View, TouchableOpacity, StyleSheet, Alert, Share, Linking, Platform,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';

import { IMAGE_PREFIX } from '@/lib/constants';
import { shareCardToKakao } from '@/lib/kakaoShare';
import { issueShare } from '@/services/card/api';
import { CARD_QUERY_KEYS } from '@/services/card/queries';
import { usePointBalance, usePointPolicies } from '@/services/point/queries';
import type { CardListItem, ShareLog } from '@/services/card/types';

const won = (n: number) => n.toLocaleString('ko-KR');

/** 카카오 서버가 직접 가져가는 썸네일이라 **절대 URL** 이어야 한다. */
const cardPhotoUrl = (path: string | null) =>
    !path ? undefined : path.startsWith('http') ? path : `${IMAGE_PREFIX}${path}`;

type Channel = Extract<ShareLog['channel'], 'kakao' | 'sms' | 'link'>;

/**
 * 발송 멱등키.
 *
 * 서버는 36자 문자열인지만 본다. 암호학적 난수가 필요한 값이 아니라 —
 * 같은 사용자의 같은 순간에 겹치지만 않으면 되는 재시도 방지용이다.
 * 이걸 위해 expo-crypto 를 새로 달 이유가 없다.
 */
function makeRequestKey(): string {
    const h = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1);
    return `${h()}${h()}-${h()}-${h()}-${h()}-${h()}${h()}${h()}`;
}

/**
 * 명함 발송.
 *
 * ⚠️ **링크 발급 = 발송 1건**이고, 포인트도 여기서 나간다.
 *    카카오 공유든 문자든 "실제로 보냈는지" 를 돌려주지 않으므로 셀 수 있는 지점이
 *    발급뿐이다. 그래서 시트를 여는 것만으로는 발급하지 않고 **채널을 고른 순간**에
 *    발급한다.
 *
 * requestKey 는 채널을 고를 때마다 새로 만든다. 같은 키로 다시 부르면 서버가
 * 기존 토큰을 그대로 돌려주므로(재시도 중복 방지), 새 발송에는 새 키여야 한다.
 */
export function ShareSheet({
    card,
    onClose,
}: {
    card: CardListItem | null;
    onClose: () => void;
}) {
    const qc = useQueryClient();
    const [busy, setBusy] = useState<Channel | null>(null);

    const { data: balance } = usePointBalance();
    const { data: policies } = usePointPolicies();

    const policy = balance?.enabled ? policies?.find((x) => x.code === 'card_share') : undefined;
    const cost = policy?.amount ?? 0;
    const short = cost > 0 && (balance?.balance ?? 0) < cost;

    if (!card) return null;

    const send = async (channel: Channel) => {
        if (busy) return;
        if (short) {
            Alert.alert(
                '포인트가 부족합니다',
                `발송에 ${won(cost)}P가 필요합니다.\n지금 ${won(balance?.balance ?? 0)}P 있어요.`,
            );
            return;
        }

        setBusy(channel);
        try {
            const { token } = await issueShare(card.id, {
                requestKey: makeRequestKey(),
                channel,
            });
            const url = `${WEB_URL}/card/${token}`;
            const message = `${card.name} 명함입니다.\n${url}`;

            qc.invalidateQueries({ queryKey: CARD_QUERY_KEYS.list });
            qc.invalidateQueries({ queryKey: ['point-balance'] });
            qc.invalidateQueries({ queryKey: ['point-history'] });

            if (channel === 'link') {
                // 앱에서는 클립보드보다 공유 시트가 낫다 — 복사한 다음 붙여넣을 앱을
                // 직접 열어야 하는데, 그 한 단계에서 대부분 그만둔다.
                await Share.share({ message: url });
            } else if (channel === 'sms') {
                // iOS 는 `sms:&body=`, 안드로이드는 `sms:?body=` 라야 본문이 들어간다.
                const sep = Platform.OS === 'ios' ? '&' : '?';
                await Linking.openURL(`sms:${sep}body=${encodeURIComponent(message)}`);
            } else {
                // 카카오톡은 **네이티브 SDK 로 직접 그린다**(웹과 같은 피드 템플릿).
                // OS 공유 시트로 텍스트만 던지면 카톡이 링크를 긁어 OG 미리보기를
                // 만드는데, 제목·썸네일을 우리가 못 고르고 "명함 보기" 버튼도 없다.
                // 받는 사람이 보는 첫 화면이라 여기서 밀리면 안 된다.
                try {
                    await shareCardToKakao({
                        url,
                        title: card.name.trim()
                            ? `${card.name.trim()}님의 명함을 확인해보세요`
                            : '명함을 확인해보세요',
                        imageUrl: cardPhotoUrl(card.photoPath),
                    });
                } catch (e) {
                    // 카카오톡이 없거나 SDK 가 실패한 기기에서는 링크라도 나가야 한다.
                    // **여기서 멈추면 이미 차감된 포인트로 아무것도 못 보낸 셈이 된다.**
                    console.warn('[card] 카카오 공유 실패 — 공유 시트로 대체', e);
                    await Share.share({ message });
                }
            }
            onClose();
        } catch (e: any) {
            Alert.alert('발송 실패', e?.response?.data?.message ?? '링크 발급에 실패했습니다.');
        } finally {
            setBusy(null);
        }
    };

    return (
        <Modal visible transparent animationType="slide" onRequestClose={onClose}>
            <View style={s.overlay}>
                <View style={s.sheet}>
                    <View style={s.handle} />
                    <Text style={s.title}>{card.title || card.name} 보내기</Text>
                    <Text style={s.desc}>
                        보낼 때마다 링크가 새로 발급됩니다. 누가 열었는지 따로 셉니다.
                    </Text>

                    <View style={s.row}>
                        <ChannelBtn
                            icon="chatbubble-ellipses"
                            label="카카오톡"
                            busy={busy === 'kakao'}
                            onPress={() => send('kakao')}
                        />
                        <ChannelBtn
                            icon="chatbox"
                            label="문자"
                            busy={busy === 'sms'}
                            onPress={() => send('sms')}
                        />
                        <ChannelBtn
                            icon="link"
                            label="링크만"
                            busy={busy === 'link'}
                            onPress={() => send('link')}
                        />
                    </View>

                    {cost > 0 && (
                        <Text style={short ? s.costWarn : s.cost}>
                            {short
                                ? `포인트가 ${won(cost - (balance?.balance ?? 0))}P 부족합니다`
                                : `보내면 ${won(cost)}P 차감 · 보유 ${won(balance?.balance ?? 0)}P`}
                        </Text>
                    )}

                    <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.8}>
                        <Text style={s.closeText}>닫기</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

function ChannelBtn({
    icon, label, busy, onPress,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    busy: boolean;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity
            style={[s.channel, busy && { opacity: 0.5 }]}
            onPress={onPress}
            disabled={busy}
            activeOpacity={0.85}
        >
            <View style={s.channelIcon}>
                <Ionicons name={icon} size={20} color="#334155" />
            </View>
            <Text style={s.channelLabel}>{busy ? '발급 중…' : label}</Text>
        </TouchableOpacity>
    );
}

const s = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30,
    },
    handle: {
        width: 40, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0',
        alignSelf: 'center', marginBottom: 14,
    },
    title: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
    desc: { fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 18 },

    row: { flexDirection: 'row', gap: 10, marginTop: 18 },
    channel: {
        flex: 1, alignItems: 'center', gap: 6,
        backgroundColor: '#f8fafc', borderRadius: 14, paddingVertical: 16,
    },
    channelIcon: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff',
        alignItems: 'center', justifyContent: 'center',
    },
    channelLabel: { fontSize: 12, fontWeight: '600', color: '#475569' },

    cost: { fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 14 },
    costWarn: { fontSize: 12, color: '#dc2626', textAlign: 'center', marginTop: 14 },

    closeBtn: { paddingVertical: 14, marginTop: 6, alignItems: 'center' },
    closeText: { fontSize: 14, color: '#94a3b8' },
});
