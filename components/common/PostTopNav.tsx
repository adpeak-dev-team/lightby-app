import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type NavAction = {
  icon: string;
  color?: string;
  onPress: () => void;
  disabled?: boolean;
};

type Props = {
  title: string;
  onBack: () => void;
  rightActions?: NavAction[];
};

export default function PostTopNav({ title, onBack, rightActions }: Props) {
  return (
    <View style={s.navbar}>
      <TouchableOpacity onPress={onBack} hitSlop={8} style={s.navBtn}>
        <Ionicons name="chevron-back" size={24} color="#111827" />
      </TouchableOpacity>
      <Text style={s.navTitle}>{title}</Text>
      <View style={s.navRight}>
        {rightActions?.map((action, i) => (
          <TouchableOpacity
            key={i}
            onPress={action.onPress}
            hitSlop={8}
            style={s.navBtn}
            disabled={action.disabled}
          >
            <Ionicons
              name={action.icon as any}
              size={22}
              color={action.color ?? '#111827'}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  navbar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
    backgroundColor: '#fff',
  },
  navBtn: { padding: 6 },
  navTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: '#111827' },
  navRight: { flexDirection: 'row', alignItems: 'center' },
});
