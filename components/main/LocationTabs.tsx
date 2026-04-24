import { useRef } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { regions } from '@/lib/constants';

interface LocationTabsProps {
  location: string;
  onLocationChange: (region: string) => void;
}

export default function LocationTabs({ location, onLocationChange }: LocationTabsProps) {
  const scrollRef = useRef<ScrollView>(null);

  const handlePress = (region: string, index: number) => {
    onLocationChange(region);
    // 선택된 탭으로 스크롤
    scrollRef.current?.scrollTo({ x: Math.max(0, index * 82 - 80), animated: true });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {regions.map((region, index) => {
          const isActive = region === location;
          return (
            <TouchableOpacity
              key={region}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => handlePress(region, index)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {region}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
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
    borderColor: '#e5e7eb',
  },
  chipActive: {
    backgroundColor: '#007595',
    borderColor: '#007595',
  },
  chipText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
});
