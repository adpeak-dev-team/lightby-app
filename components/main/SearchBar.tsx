import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Modal, StyleSheet, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type SortVal = 'DEFAULT' | 'HIGH_FEE' | 'LATEST' | 'VIEW_COUNT';

const SORT_OPTIONS: { label: string; value: SortVal }[] = [
  { label: '최신순',       value: 'LATEST' },
  { label: '높은 수수료순', value: 'HIGH_FEE' },
  { label: '조회순',       value: 'VIEW_COUNT' },
];

interface SearchBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  sort: SortVal;
  onSortChange: (val: SortVal) => void;
}

export default function SearchBar({ search, onSearchChange, sort, onSortChange }: SearchBarProps) {
  const [localInput, setLocalInput] = useState(search);
  const [focused, setFocused] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const handleSubmit = () => {
    onSearchChange(localInput.trim());
    setFocused(false);
  };

  const handleClear = () => {
    setLocalInput('');
    onSearchChange('');
  };

  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? '최신순';

  return (
    <View style={styles.wrap}>
      <View style={[styles.bar, focused && styles.barFocused]}>
        <Ionicons name="search-outline" size={16} color="#9ca3af" />

        <TextInput
          style={styles.input}
          value={localInput}
          onChangeText={setLocalInput}
          placeholder="어떤 현장을 찾으시나요?"
          placeholderTextColor="#9ca3af"
          returnKeyType="search"
          onSubmitEditing={handleSubmit}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCorrect={false}
          autoCapitalize="none"
        />

        {!!localInput && (
          <TouchableOpacity onPress={handleClear} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color="#9ca3af" />
          </TouchableOpacity>
        )}

        <View style={styles.divider} />

        <TouchableOpacity style={styles.sortBtn} onPress={() => setSortOpen(true)}>
          <Text style={styles.sortLabel}>{currentSortLabel}</Text>
          <Ionicons name="funnel-outline" size={13} color="#6b7280" />
        </TouchableOpacity>
      </View>

      {/* 정렬 모달 */}
      <Modal visible={sortOpen} transparent animationType="fade" onRequestClose={() => setSortOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setSortOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
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
              {sort === opt.value && <Ionicons name="checkmark" size={16} color="#0ea5e9" />}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  barFocused: {
    borderColor: '#0ea5e9',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    padding: 0,
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: '#e5e7eb',
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
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
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
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
    backgroundColor: '#f0f9ff',
  },
  sheetItemText: {
    fontSize: 14,
    color: '#374151',
  },
  sheetItemTextActive: {
    color: '#0ea5e9',
    fontWeight: '700',
  },
});
