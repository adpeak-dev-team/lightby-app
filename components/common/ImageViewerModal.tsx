import { useCallback, useState } from 'react';
import {
  Modal, View, StyleSheet, TouchableOpacity, useWindowDimensions,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Carousel from 'react-native-reanimated-carousel';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;

/**
 * 확대/이동이 되는 단일 이미지.
 * 확대 상태(scale > 1)가 되면 부모 캐러셀의 스와이프를 꺼야 좌우 이동과 충돌하지 않는다.
 */
function ZoomableImage({
  uri, width, height, onZoomChange,
}: {
  uri: string;
  width: number;
  height: number;
  onZoomChange: (zoomed: boolean) => void;
}) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  // 확대 여부를 JS 쪽 state로도 들고 있어야 pan 제스처를 켜고 끌 수 있다.
  // ⚠️ pan을 항상 켜두면 손가락을 대는 즉시 제스처를 점유해서
  //    부모 캐러셀의 좌우 스와이프가 아예 동작하지 않는다.
  const [isZoomed, setIsZoomed] = useState(false);
  const setZoom = useCallback((z: boolean) => {
    setIsZoomed(z);
    onZoomChange(z);
  }, [onZoomChange]);

  const resetAll = () => {
    'worklet';
    scale.value = withTiming(1);
    tx.value = withTiming(0);
    ty.value = withTiming(0);
    savedScale.value = 1;
    savedTx.value = 0;
    savedTy.value = 0;
    runOnJS(setZoom)(false);
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(Math.max(savedScale.value * e.scale, 1), MAX_SCALE);
    })
    .onEnd(() => {
      if (scale.value <= 1.01) {
        resetAll();
      } else {
        savedScale.value = scale.value;
        runOnJS(setZoom)(true);
      }
    });

  // 확대된 상태에서만 켠다. 꺼져 있으면 제스처를 점유하지 않으므로
  // 캐러셀이 좌우 스와이프를 정상적으로 받는다.
  const pan = Gesture.Pan()
    .enabled(isZoomed)
    .averageTouches(true)
    .onUpdate((e) => {
      tx.value = savedTx.value + e.translationX;
      ty.value = savedTy.value + e.translationY;
    })
    .onEnd(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (savedScale.value > 1) {
        resetAll();
      } else {
        scale.value = withTiming(DOUBLE_TAP_SCALE);
        savedScale.value = DOUBLE_TAP_SCALE;
        runOnJS(setZoom)(true);
      }
    });

  const composed = Gesture.Simultaneous(pinch, pan, doubleTap);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[{ width, height }, animStyle]}>
        <Image source={{ uri }} style={{ width, height }} contentFit="contain" />
      </Animated.View>
    </GestureDetector>
  );
}

interface Props {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

/**
 * 전체화면 이미지 뷰어.
 *
 * 상세 페이지 인라인 캐러셀은 화면을 조금만 차지하게 두고(세로 스크롤과 안 싸우게),
 * 이미지를 제대로 볼 때는 이 뷰어를 연다. 여기서는 세로 스크롤 경쟁자가 없어
 * 좌우 스와이프가 명확하고, 핀치/더블탭 확대로 작은 글씨도 읽을 수 있다.
 */
export function ImageViewerModal({ visible, images, initialIndex = 0, onClose }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(initialIndex);
  const [zoomed, setZoomed] = useState(false);

  // 슬라이드가 바뀌면 확대 상태를 푼다 (다음 장이 확대된 채로 뜨지 않도록)
  const handleSnap = useCallback((i: number) => {
    setIndex(i);
    setZoomed(false);
  }, []);

  if (images.length === 0) return null;

  return (
    <Modal visible={visible} transparent={false} animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={s.container}>
        <Carousel
          width={width}
          height={height}
          data={images}
          defaultIndex={Math.min(initialIndex, images.length - 1)}
          loop={false}
          // 확대 중에는 좌우 스와이프를 꺼서 이미지 이동과 충돌하지 않게 한다
          enabled={!zoomed && images.length > 1}
          onSnapToItem={handleSnap}
          renderItem={({ item }) => (
            <View style={s.slide}>
              <ZoomableImage uri={item} width={width} height={height} onZoomChange={setZoomed} />
            </View>
          )}
        />

        <TouchableOpacity
          style={[s.closeBtn, { top: insets.top + 8 }]}
          onPress={onClose}
          hitSlop={10}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={26} color="#fff" />
        </TouchableOpacity>

        {images.length > 1 && (
          <View style={[s.counter, { bottom: insets.bottom + 20 }]}>
            <Text style={s.counterText}>{index + 1} / {images.length}</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  closeBtn: {
    position: 'absolute', right: 12,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  counter: {
    position: 'absolute', alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
  },
  counterText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
