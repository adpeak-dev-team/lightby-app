import { useState, useRef, useCallback } from 'react';
import {
  View, TouchableOpacity, Modal, StyleSheet, Pressable, Animated, PanResponder,
} from 'react-native';
import { TextInput } from '@/components/common/AppTextInput';
import { Text } from '@/components/common/AppText';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SortVal = 'DEFAULT' | 'HIGH_FEE' | 'LATEST' | 'VIEW_COUNT';

const SORT_OPTIONS: { label: string; value: SortVal }[] = [
  { label: '최신순', value: 'LATEST' },
  { label: '높은 수수료순', value: 'HIGH_FEE' },
  { label: '조회순', value: 'VIEW_COUNT' },
];

interface SearchBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  sort: SortVal;
  onSortChange: (val: SortVal) => void;
}

export default function SearchBar({ search, onSearchChange, sort, onSortChange }: SearchBarProps) {
  const insets = useSafeAreaInsets();
  const [localInput, setLocalInput] = useState(search);
  const [focused, setFocused] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const translateY = useRef(new Animated.Value(0)).current;

  const closeSheet = useCallback(() => {
    Animated.timing(translateY, {
      toValue: 300,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setSortOpen(false);
    });
  }, [translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 2,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80 || g.vy > 0.5) {
          closeSheet();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  const openSheet = () => {
    translateY.setValue(0);
    setSortOpen(true);
  };

  const handleSubmit = () => {
    onSearchChange(localInput.trim());
    setFocused(false);
  };

  const handleClear = () => {
    setLocalInput('');
    onSearchChange('');
  };

  return (
    <View style={styles.wrap}>
      <View style={[styles.bar, focused && styles.barFocused]}>
        <Ionicons name="search-outline" size={16} color="#94a3b8" />

        <TextInput
          style={styles.input}
          value={localInput}
          onChangeText={setLocalInput}
          placeholder="어떤 현장을 찾으시나요?"
          placeholderTextColor="#94a3b8"
          returnKeyType="search"
          onSubmitEditing={handleSubmit}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCorrect={false}
          autoCapitalize="none"
        />

        {!!localInput && (
          <TouchableOpacity onPress={handleClear} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color="#94a3b8" />
          </TouchableOpacity>
        )}

        <View style={styles.divider} />

        <TouchableOpacity style={styles.sortBtn} onPress={openSheet}>
          <Text style={styles.sortLabel}>필터</Text>
          <Ionicons name="funnel-outline" size={13} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* 정렬 모달 */}
      <Modal visible={sortOpen} transparent animationType="none" onRequestClose={closeSheet}>
        <Pressable style={styles.overlay} onPress={closeSheet} />
        <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + 24, transform: [{ translateY }] }]}>
          <View style={styles.sheetHandle} {...panResponder.panHandlers} />
          <Text style={styles.sheetTitle}>정렬 옵션</Text>
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.sheetItem, sort === opt.value && styles.sheetItemActive]}
              onPress={() => { onSortChange(opt.value); setSortOpen(false); }}
            >
              <Text style={[styles.sheetItemText, sort === opt.value && styles.sheetItemTextActive]}>
                {opt.label}
              </Text>
              {sort === opt.value && <Ionicons name="checkmark" size={16} color="#3b82f6" />}
            </TouchableOpacity>
          ))}
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16, // px-4
    paddingVertical: 4, // mb-1 톤
    backgroundColor: '#fff',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff', // 웹 기본: 흰 배경
    borderRadius: 16, // rounded-2xl
    paddingHorizontal: 16, // px-4
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: '#f1f5f9', // border-slate-100
  },
  barFocused: {
    borderColor: '#3b82f6', // border-primary-500
    backgroundColor: '#fff',
    // NOTE: 포커스 시 elevation/shadow를 토글하면 안드로이드에서 네이티브 뷰가
    // 재생성되며 자식 TextInput의 포커스가 즉시 풀린다. 테두리 색으로만 표현한다.
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b', // text-slate-800
    padding: 0,
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: '#e2e8f0',
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '400',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  sheetItemActive: {
    backgroundColor: '#eff6ff', // primary-50
  },
  sheetItemText: {
    fontSize: 14,
    color: '#334155',
  },
  sheetItemTextActive: {
    color: '#2563eb', // primary-600
    fontWeight: '600',
  },
});
