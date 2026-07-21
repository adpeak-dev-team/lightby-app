import { useCallback, useState } from 'react';
import { Platform, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * 헤더(네비바) 아래에서 시작하는 KeyboardAvoidingView용 오프셋.
 *
 * iOS의 behavior="padding"은 KAV 위쪽 높이만큼 보정해 주지 않으면
 * 하단 입력바/버튼이 키보드에 가려진다. 헤더 높이는 기기·폰트 배율에 따라
 * 달라지므로 상수 대신 onLayout으로 실측한다.
 * Android는 windowSoftInputMode(pan)가 처리하므로 0을 준다.
 *
 * 사용법:
 *   const { onHeaderLayout, keyboardVerticalOffset } = useHeaderKeyboardOffset();
 *   <View onLayout={onHeaderLayout}>...헤더...</View>
 *   <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={keyboardVerticalOffset}>
 */
export function useHeaderKeyboardOffset() {
    const { top } = useSafeAreaInsets();
    const [headerHeight, setHeaderHeight] = useState(0);

    const onHeaderLayout = useCallback((e: LayoutChangeEvent) => {
        setHeaderHeight(e.nativeEvent.layout.height);
    }, []);

    const keyboardVerticalOffset = Platform.OS === 'ios' ? top + headerHeight : 0;

    return { onHeaderLayout, keyboardVerticalOffset };
}
