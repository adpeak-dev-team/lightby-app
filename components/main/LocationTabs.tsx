import { useRef, useState } from 'react';
import {
  ScrollView, View, TouchableOpacity, StyleSheet, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/common/AppText';
import { regions } from '@/lib/constants';

interface LocationTabsProps {
  location: string;
  onLocationChange: (region: string) => void;
}

const FADE_WIDTH = 28;

export default function LocationTabs({ location, onLocationChange }: LocationTabsProps) {
  const scrollRef = useRef<ScrollView>(null);
  // 각 칩의 실제 위치/너비 (가변 폭 지역명 대응)
  const chipLayouts = useRef<Record<number, { x: number; width: number }>>({});

  // 스크롤 위치에 따라 양 끝 페이드 표시 여부 결정
  const [scrollX, setScrollX] = useState(0);
  const [contentW, setContentW] = useState(0);
  const [containerW, setContainerW] = useState(0);

  const maxScroll = Math.max(0, contentW - containerW);
  const showLeftFade = scrollX > 4;
  const showRightFade = scrollX < maxScroll - 4;

  // 선택한 칩이 화면 중앙에 오도록 스크롤
  const centerToIndex = (index: number) => {
    const l = chipLayouts.current[index];
    if (!l || containerW === 0) return;
    const target = l.x + l.width / 2 - containerW / 2;
    const max = Math.max(0, contentW - containerW);
    scrollRef.current?.scrollTo({ x: Math.min(Math.max(0, target), max), animated: true });
  };

  const handlePress = (region: string, index: number) => {
    onLocationChange(region);
    centerToIndex(index);
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollX(e.nativeEvent.contentOffset.x);
  };

  return (
    <View style={styles.container} onLayout={(e) => setContainerW(e.nativeEvent.layout.width)}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onContentSizeChange={(w) => setContentW(w)}
      >
        {regions.map((region, index) => {
          const isActive = region === location;
          return (
            <TouchableOpacity
              key={region}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => handlePress(region, index)}
              onLayout={(e) => {
                const { x, width } = e.nativeEvent.layout;
                chipLayouts.current[index] = { x, width };
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {region}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 양 끝 페이드 — 칩이 가장자리에서 부드럽게 사라지도록 */}
      {showLeftFade && (
        <LinearGradient
          colors={['#fff', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fade, styles.fadeLeft]}
          pointerEvents="none"
        />
      )}
      {showRightFade && (
        <LinearGradient
          colors={['rgba(255,255,255,0)', '#fff']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fade, styles.fadeRight]}
          pointerEvents="none"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    position: 'relative',
  },
  content: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  chipText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  fade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: FADE_WIDTH,
  },
  fadeLeft: { left: 0 },
  fadeRight: { right: 0 },
});
