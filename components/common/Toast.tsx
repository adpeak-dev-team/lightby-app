import { useEffect, useRef, useState } from 'react';
import { Animated, Text, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { registerToastHandler, ToastOptions, ToastType } from '@/hooks/use-toast';

interface ToastItem extends ToastOptions {
    id: number;
}

const TYPE_CONFIG: Record<ToastType, { bg: string; icon: keyof typeof Ionicons.glyphMap; iconColor: string }> = {
    success: { bg: '#22c55e', icon: 'checkmark-circle', iconColor: '#fff' },
    error: { bg: '#ef4444', icon: 'close-circle', iconColor: '#fff' },
    info: { bg: '#38bdf8', icon: 'information-circle', iconColor: '#fff' },
    warning: { bg: '#f59e0b', icon: 'warning', iconColor: '#fff' },
};

export default function Toast() {
    const insets = useSafeAreaInsets();
    const [items, setItems] = useState<ToastItem[]>([]);
    const counter = useRef(0);

    useEffect(() => {
        registerToastHandler((opts) => {
            const id = ++counter.current;
            setItems((prev) => [...prev, { id, type: 'info', duration: 3000, ...opts }]);
        });
    }, []);

    const remove = (id: number) => setItems((prev) => prev.filter((t) => t.id !== id));

    // 탭바 높이(52) + SafeArea 하단 + 여백
    const bottomOffset = insets.bottom + 52 + 12;

    return (
        <View style={[styles.container, { bottom: bottomOffset }]} pointerEvents="none">
            {items.map((item) => (
                <ToastBubble key={item.id} item={item} onHide={() => remove(item.id)} />
            ))}
        </View>
    );
}

function ToastBubble({ item, onHide }: { item: ToastItem; onHide: () => void }) {
    const translateY = useRef(new Animated.Value(80)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const config = TYPE_CONFIG[item.type ?? 'info'];

    useEffect(() => {
        Animated.parallel([
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 15, stiffness: 200 }),
            Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        ]).start();

        const timer = setTimeout(() => {
            Animated.parallel([
                Animated.timing(translateY, { toValue: 80, duration: 220, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
            ]).start(() => onHide());
        }, item.duration ?? 3000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <Animated.View style={[styles.bubble, { backgroundColor: config.bg, transform: [{ translateY }], opacity }]}>
            <Ionicons name={config.icon} size={18} color={config.iconColor} />
            <Text style={styles.message}>{item.message}</Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 16,
        right: 16,
        zIndex: 9999,
        gap: 8,
        alignItems: 'stretch',
    },
    bubble: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
    },
    message: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        flexShrink: 1,
    },
});
