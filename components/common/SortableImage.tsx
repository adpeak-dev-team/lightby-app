import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Image, Text, StyleSheet, Alert, ActivityIndicator,
  TouchableOpacity, LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, useAnimatedReaction, withSpring, SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { apiClient } from '@/api/apiClient';

const MAX_WIDTH = 1280;
const COMPRESS_QUALITY = 0.75;

async function compressImage(uri: string, mimeType: string): Promise<{ uri: string; type: string }> {
  if (mimeType === 'image/gif') return { uri, type: mimeType };

  const ctx = ImageManipulator.manipulate(uri);
  ctx.resize({ width: MAX_WIDTH });
  const img = await ctx.renderAsync();
  const result = await img.saveAsync({ compress: COMPRESS_QUALITY, format: SaveFormat.JPEG });
  return { uri: result.uri, type: 'image/jpeg' };
}

const GCS_PREFIX = process.env.EXPO_PUBLIC_IMAGE_PREFIX ?? '';
const COLS = 3;
const GAP = 8;
const SPRING = { damping: 20, stiffness: 300, mass: 0.5 };

export type ImageItem = { id: string; url: string };

interface SortableImageProps {
  folder?: string;
  initialImages?: string[];
  onChange?: (images: string[]) => void;
  onUploaded?: (paths: string[]) => void;
}

// ──────────────────────────────────────────────────────────────────────────────
// 개별 드래그 아이템
// ──────────────────────────────────────────────────────────────────────────────
function DraggableItem({
  item, index, totalCount, itemSize,
  floatBaseX, floatBaseY, floatTx, floatTy, floatVisible,
  draggingFrom, draggingTo, strideSV,
  setFloatingUrl, onDragEnd, onRemove,
}: {
  item: ImageItem;
  index: number;
  totalCount: number;
  itemSize: number;
  floatBaseX: SharedValue<number>;
  floatBaseY: SharedValue<number>;
  floatTx: SharedValue<number>;
  floatTy: SharedValue<number>;
  floatVisible: SharedValue<boolean>;
  draggingFrom: SharedValue<number>;
  draggingTo: SharedValue<number>;
  strideSV: SharedValue<number>;
  setFloatingUrl: (url: string) => void;
  onDragEnd: (from: number, to: number) => void;
  onRemove: (id: string) => void;
}) {
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const startTx = useSharedValue(0);
  const startTy = useSharedValue(0);

  // 드래그 중 실시간 순서 변경 → 위치 애니메이션
  useAnimatedReaction(
    () => [draggingFrom.value, draggingTo.value] as [number, number],
    (curr, prev) => {
      const [from, to] = curr;
      const [pFrom, pTo] = prev ?? [-2, -2];
      if (from === pFrom && to === pTo) return;

      if (from === -1 || from === index) {
        offsetX.value = withSpring(0, SPRING);
        offsetY.value = withSpring(0, SPRING);
        return;
      }

      let vi = index;
      if (from < to && index > from && index <= to) vi = index - 1;
      else if (from > to && index >= to && index < from) vi = index + 1;

      const stride = strideSV.value;
      offsetX.value = withSpring((vi % COLS - index % COLS) * stride, SPRING);
      offsetY.value = withSpring(
        (Math.floor(vi / COLS) - Math.floor(index / COLS)) * stride,
        SPRING,
      );
    },
  );

  const pan = Gesture.Pan()
    .minDistance(10)
    .onStart((e) => {
      'worklet';
      const stride = strideSV.value;
      startTx.value = e.translationX;
      startTy.value = e.translationY;
      floatBaseX.value = (index % COLS) * stride;
      floatBaseY.value = Math.floor(index / COLS) * stride;
      floatTx.value = 0;
      floatTy.value = 0;
      draggingFrom.value = index;
      draggingTo.value = index;
      floatVisible.value = true;
      scheduleOnRN(setFloatingUrl, item.url);
    })
    .onUpdate((e) => {
      'worklet';
      const stride = strideSV.value;
      const tx = e.translationX - startTx.value;
      const ty = e.translationY - startTy.value;
      floatTx.value = tx;
      floatTy.value = ty;

      const col = index % COLS;
      const row = Math.floor(index / COLS);
      const tc = Math.max(0, Math.min(COLS - 1, col + Math.round(tx / stride)));
      const tr = Math.max(0, row + Math.round(ty / stride));
      const newTo = Math.min(totalCount - 1, tr * COLS + tc);
      if (draggingTo.value !== newTo) {
        draggingTo.value = newTo;
      }
    })
    .onEnd(() => {
      'worklet';
      const from = draggingFrom.value;
      const to = draggingTo.value;
      draggingFrom.value = -1;
      draggingTo.value = -1;
      floatVisible.value = false;
      scheduleOnRN(onDragEnd, from, to);
    })
    .onFinalize(() => {
      'worklet';
      draggingFrom.value = -1;
      draggingTo.value = -1;
      floatVisible.value = false;
    });

  const animStyle = useAnimatedStyle(() => ({
    opacity: draggingFrom.value === index ? 0.25 : 1,
    transform: [
      { translateX: offsetX.value },
      { translateY: offsetY.value },
    ],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[s.item, { width: itemSize, height: itemSize }, animStyle]}>
        <Image source={{ uri: item.url }} style={s.image} />
        <TouchableOpacity
          style={s.removeBtn}
          onPress={() => onRemove(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={s.removeBtnText}>✕</Text>
        </TouchableOpacity>
      </Animated.View>
    </GestureDetector>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ──────────────────────────────────────────────────────────────────────────────
export default function SortableImage({
  folder = 'test',
  initialImages = [],
  onChange,
  onUploaded,
}: SortableImageProps) {
  const [items, setItems] = useState<ImageItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [floatingUrl, setFloatingUrl] = useState('');
  // 그리드 실제 너비로 계산한 아이템 크기 (초기값 0 → 레이아웃 전 렌더링 생략)
  const [itemSize, setItemSize] = useState(0);

  const itemsRef = useRef<ImageItem[]>([]);
  const prevInitial = useRef<string[]>([]);
  const isFirstRender = useRef(true);

  const floatBaseX = useSharedValue(0);
  const floatBaseY = useSharedValue(0);
  const floatTx = useSharedValue(0);
  const floatTy = useSharedValue(0);
  const floatVisible = useSharedValue(false);
  const draggingFrom = useSharedValue(-1);
  const draggingTo = useSharedValue(-1);
  // 워크릿에서 사용하는 stride (itemSize + GAP)
  const strideSV = useSharedValue(0);

  // 그리드 너비 측정 → 아이템 크기 계산
  const handleGridLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w <= 0) return;
    const size = Math.floor((w - (COLS - 1) * GAP) / COLS);
    setItemSize(size);
    strideSV.value = size + GAP;
  }, [strideSV]);

  useEffect(() => { itemsRef.current = items; }, [items]);

  // 초기 이미지 동기화
  useEffect(() => {
    const prev = prevInitial.current;
    const same =
      prev.length === initialImages.length &&
      initialImages.every((img, i) => img === prev[i]);
    if (same) return;
    prevInitial.current = [...initialImages];
    setItems(
      initialImages.map((path, i) => ({
        id: `img-${Date.now()}-${i}`,
        url: path.startsWith('http') ? path : `${GCS_PREFIX}${path}`,
      }))
    );
  }, [initialImages]);

  // 부모에 변경 전달
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    onChange?.(
      items.map((item) =>
        item.url.startsWith(GCS_PREFIX) ? item.url.slice(GCS_PREFIX.length) : item.url
      )
    );
  }, [items]);

  const handleDragEnd = useCallback((from: number, to: number) => {
    if (from === to) return;
    setItems((prev) => {
      const next = [...prev];
      const [removed] = next.splice(from, 1);
      next.splice(to, 0, removed);
      return next;
    });
  }, []);

  const handleRemove = useCallback(async (id: string) => {
    const target = itemsRef.current.find((item) => item.id === id);
    if (target && GCS_PREFIX && target.url.startsWith(GCS_PREFIX)) {
      try {
        await apiClient.delete('/internal/image-work', {
          data: { imagePath: target.url.slice(GCS_PREFIX.length) },
        });
      } catch {
        Alert.alert('오류', '이미지 삭제에 실패했습니다.');
        return;
      }
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleAddImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '사진 라이브러리 접근 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (result.canceled || result.assets.length === 0) return;

    setIsUploading(true);
    try {
      const today = new Date();
      const yy = String(today.getFullYear()).slice(-2);
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');

      const compressed = await Promise.all(
        result.assets.map(async (asset) => {
          const ext = (asset.uri.split('/').pop() ?? 'image.jpg').split('.').pop()?.toLowerCase() ?? 'jpg';
          const mimeType = ext === 'gif' ? 'image/gif' : ext === 'png' ? 'image/png' : 'image/jpeg';
          return compressImage(asset.uri, mimeType);
        }),
      );

      const formData = new FormData();
      formData.append('folder', `${folder}/imgs${yy}${mm}${dd}`);
      compressed.forEach(({ uri, type }, i) => {
        const originalName = result.assets[i].uri.split('/').pop() ?? 'image.jpg';
        const name = type === 'image/gif' ? originalName : originalName.replace(/\.[^.]+$/, '.jpg');
        formData.append('images', { uri, name, type } as unknown as Blob);
      });

      const { data } = await apiClient.post('/internal/image-work', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploadedPaths: string[] = data.urls ?? [];
      setItems((prev) => [
        ...prev,
        ...uploadedPaths.map((path) => ({
          id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          url: `${GCS_PREFIX}${path}`,
        })),
      ]);
      onUploaded?.(uploadedPaths);
    } catch (err: any) {
      console.log('[Upload Error]', err?.message);
      console.log('[Upload Error] status:', err?.response?.status);
      console.log('[Upload Error] data:', JSON.stringify(err?.response?.data));
      Alert.alert('오류', '이미지 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  // 플로팅 오버레이: strideSV에서 크기도 읽어서 아이템과 동일한 크기 유지
  const floatStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: floatBaseX.value + floatTx.value,
    top: floatBaseY.value + floatTy.value,
    width: strideSV.value - GAP,
    height: strideSV.value - GAP,
    opacity: floatVisible.value ? 0.92 : 0,
    zIndex: 100,
  }));

  return (
    <View style={s.container}>
      <View style={s.grid} onLayout={handleGridLayout}>
        {/* itemSize가 계산된 이후에만 렌더링 */}
        {itemSize > 0 && items.map((item, index) => (
          <DraggableItem
            key={item.id}
            item={item}
            index={index}
            totalCount={items.length}
            itemSize={itemSize}
            floatBaseX={floatBaseX}
            floatBaseY={floatBaseY}
            floatTx={floatTx}
            floatTy={floatTy}
            floatVisible={floatVisible}
            draggingFrom={draggingFrom}
            draggingTo={draggingTo}
            strideSV={strideSV}
            setFloatingUrl={setFloatingUrl}
            onDragEnd={handleDragEnd}
            onRemove={handleRemove}
          />
        ))}

        {/* 드래그 중 손가락을 따라다니는 플로팅 이미지 */}
        <Animated.View style={[s.item, s.floatingItem, floatStyle]} pointerEvents="none">
          {floatingUrl ? <Image source={{ uri: floatingUrl }} style={s.image} /> : null}
        </Animated.View>
      </View>

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.addBtn, isUploading && s.addBtnDisabled]}
          onPress={handleAddImage}
          disabled={isUploading}
          activeOpacity={0.8}
        >
          {isUploading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={s.addBtnText}>+ 이미지 추가</Text>}
        </TouchableOpacity>
        <Text style={s.hint}>GIF 이미지 업로드시 1MB 미만 이미지만 가능합니다.</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
    overflow: 'visible',
  },
  item: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
  },
  floatingItem: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  image: { width: '100%', height: '100%' },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  removeBtnText: { color: '#fff', fontSize: 10, fontWeight: '700', lineHeight: 12 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  addBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
    minHeight: 34,
  },
  addBtnDisabled: { opacity: 0.6 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  hint: { fontSize: 11, color: '#9ca3af', flex: 1 },
});
