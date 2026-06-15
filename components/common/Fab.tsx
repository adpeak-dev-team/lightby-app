import {
  StyleSheet, TouchableOpacity, View,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '@/lib/theme';

interface FabProps {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  bottom?: number;
}

/**
 * 글쓰기/등록용 플로팅 버튼.
 * lightby-front(웹)의 그라데이션 알약형 버튼(#3b82f6 → #2563eb)과 동일한 스타일.
 */
export function Fab({ label, onPress, icon = 'add-circle', bottom = 24 }: FabProps) {
  return (
    <View style={[s.wrap, { bottom }]} pointerEvents="box-none">
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        <LinearGradient
          colors={Colors.fabGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s.fab}
        >
          <Ionicons name={icon} size={18} color="#fff" />
          <Text style={s.label}>{label}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 16,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingLeft: 14,
    paddingRight: 18,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    ...Shadow.fab,
  },
  label: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
