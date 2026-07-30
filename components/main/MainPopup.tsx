import { useEffect, useMemo, useState } from 'react';
import { Modal, View, Pressable, TouchableOpacity, StyleSheet, Linking, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text } from '@/components/common/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useGetPopups } from '@/services/site/queries';
import { getImageUrl } from '@/lib/lib';

// 숨김 저장 키 — 팝업별로 마지막 숨김 날짜(YYYY-MM-DD) 또는 영구 숨김 표시("never")를 보관한다.
const storageKey = (id: number) => `popup_hidden_${id}`;
const todayStr = () => new Date().toISOString().split('T')[0];
const NEVER = 'never';

/**
 * 메인 팝업 — 관리자 > 팝업 관리에서 등록한 팝업을 노출한다.
 * 노출 대상(활성/기간/플랫폼) 필터는 서버가 처리하고, 여기서는 사용자가 숨긴 팝업만 추가로 걸러낸다.
 * 여러 개면 한 번에 하나씩, 닫을 때마다 다음 팝업을 보여준다.
 */
export default function MainPopup() {
  const { width, height } = useWindowDimensions();
  const { data: popups } = useGetPopups();
  const [hiddenIds, setHiddenIds] = useState<number[] | null>(null);
  const [closedIds, setClosedIds] = useState<number[]>([]);
  // 팝업별 이미지 비율(height/width) — 로드 후 카드 높이를 이미지에 맞춰 흰 여백을 없앤다
  const [ratios, setRatios] = useState<Record<number, number>>({});

  // 사용자가 이미 숨긴 팝업 id 수집 (오늘 하루 숨김 + 영구 숨김)
  useEffect(() => {
    if (!popups) return;
    let cancelled = false;
    (async () => {
      const today = todayStr();
      const entries = await AsyncStorage.multiGet(popups.map((p) => storageKey(p.id)));
      const hidden = popups
        .filter((_, i) => entries[i]?.[1] === today || entries[i]?.[1] === NEVER)
        .map((p) => p.id);
      if (!cancelled) setHiddenIds(hidden);
    })().catch(() => {
      if (!cancelled) setHiddenIds([]);
    });
    return () => { cancelled = true; };
  }, [popups]);

  const current = useMemo(() => {
    if (!popups || hiddenIds === null) return null;
    return popups.find((p) => !hiddenIds.includes(p.id) && !closedIds.includes(p.id)) ?? null;
  }, [popups, hiddenIds, closedIds]);

  if (!current) return null;

  const imageUri = getImageUrl(current.imageUrl) ?? undefined;
  const ratio = ratios[current.id];
  const cardWidth = Math.min(width - 56, 340);

  // 비율을 모르는 동안에는 팝업 대신 화면 밖 프로브 이미지만 먼저 띄워 크기를 잰다.
  // (기본 비율로 먼저 그리면 로드 후 카드가 리사이즈되며 흰 여백이 깜빡인다. expo-image가 받아둔
  //  이미지는 캐시되므로 실제 팝업은 곧바로 그려진다.)
  // ⚠️ allowDownscaling 을 끄지 않으면 Fresco가 뷰 크기에 맞춰 다운샘플링한 뒤 그 크기를 알려준다.
  //    1x1 프로브에서는 1200x630 이 7x3 으로 줄어 비율이 0.43 으로 깨졌었다.
  if (!ratio) {
    return (
      <Image
        source={{ uri: imageUri }}
        style={[s.probe, { width: cardWidth, height: cardWidth }]}
        allowDownscaling={false}
        onLoad={({ source }) => {
          const next = source?.width && source?.height ? source.height / source.width : 4 / 3;
          setRatios((prev) => ({ ...prev, [current.id]: next }));
        }}
        // 크기를 못 읽어도 팝업 자체는 뜨도록 기본 비율로 진행
        onError={() => setRatios((prev) => ({ ...prev, [current.id]: 4 / 3 }))}
      />
    );
  }

  const imageHeight = Math.min(cardWidth * ratio, height * 0.7);

  const close = () => setClosedIds((prev) => [...prev, current.id]);

  // 오늘 하루면 날짜, 영구면 'never' 를 저장한다
  const dismiss = (forever: boolean) => {
    AsyncStorage.setItem(storageKey(current.id), forever ? NEVER : todayStr()).catch(() => null);
    setHiddenIds((prev) => [...(prev ?? []), current.id]);
  };

  const { dismissToday: showToday, dismissNever: showNever } = current;
  // 둘 다 켜져 있으면 숨김 버튼을 윗줄에 두고 닫기를 아랫줄 전체 너비로 — 한 줄에 3개면 좁은 화면에서 깨진다
  const isStacked = showToday && showNever;

  const openLink = () => {
    if (current.linkUrl) Linking.openURL(current.linkUrl).catch(() => null);
    close();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <Pressable style={s.overlay} onPress={close} />
      <View style={s.wrap} pointerEvents="box-none">
        <View style={[s.card, { width: cardWidth }]}>
          {/* 닫기 */}
          <TouchableOpacity style={s.closeBtn} onPress={close} activeOpacity={0.8}>
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={current.linkUrl ? 0.9 : 1}
            onPress={current.linkUrl ? openLink : undefined}
          >
            <Image
              source={{ uri: imageUri }}
              style={{ width: cardWidth, height: imageHeight }}
              contentFit="contain"
            />
          </TouchableOpacity>

          {/* 하단 버튼 — 둘 다인 경우 숨김 버튼은 윗줄, 닫기는 아랫줄 */}
          <View style={s.btnRow}>
            {showToday && (
              <TouchableOpacity style={s.todayBtn} onPress={() => dismiss(false)} activeOpacity={0.8}>
                <Text style={s.todayText}>오늘 하루 보지 않기</Text>
              </TouchableOpacity>
            )}
            {showNever && (
              <TouchableOpacity
                style={[s.todayBtn, showToday && s.closeTextBtnBordered]}
                onPress={() => dismiss(true)}
                activeOpacity={0.8}
              >
                <Text style={s.todayText}>다시 보지 않기</Text>
              </TouchableOpacity>
            )}
            {!isStacked && (
              <TouchableOpacity
                style={[s.closeTextBtn, (showToday || showNever) && s.closeTextBtnBordered]}
                onPress={close}
                activeOpacity={0.8}
              >
                <Text style={s.closeText}>닫기</Text>
              </TouchableOpacity>
            )}
          </View>
          {isStacked && (
            <TouchableOpacity style={s.closeRow} onPress={close} activeOpacity={0.8}>
              <Text style={s.closeText}>닫기</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  // 크기 측정용 — 화면 밖에 두어 레이아웃에 영향 없이 이미지를 로드한다
  probe: { position: 'absolute', left: -10000, top: -10000, opacity: 0 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(17,24,39,0.5)' },
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' },
  closeBtn: {
    position: 'absolute', top: 8, right: 8, zIndex: 10,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center',
  },
  btnRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  todayBtn: { flex: 1, paddingVertical: 13, alignItems: 'center' },
  todayText: { fontSize: 14, color: '#64748b' },
  closeTextBtn: { flex: 1, paddingVertical: 13, alignItems: 'center' },
  // '둘 다'일 때 아랫줄 전체 너비 닫기 버튼
  closeRow: { paddingVertical: 13, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  closeTextBtnBordered: { borderLeftWidth: 1, borderLeftColor: '#f1f5f9' },
  closeText: { fontSize: 14, fontWeight: '700', color: '#334155' },
});
