import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * 화면 하단까지 차지하는 KeyboardAvoidingView(behavior="padding")용 오프셋.
 *
 * RN은 KAV의 프레임을 "부모 기준" 좌표로 재는데, 이 앱의 화면들은 루트
 * SafeAreaView(edges={['top']}) 안에 있어 좌표계가 이미 상단 inset만큼 내려가 있다.
 * 그 결과 계산되는 패딩이 상단 inset만큼 부족해져 입력바가 키보드에 가려진다.
 * 따라서 보정값은 정확히 insets.top 이다. (헤더 높이를 더하면 반대로 과하게 밀린다)
 *
 * Android는 windowSoftInputMode(pan)가 처리하므로 0.
 *
 * 사용법:
 *   const { keyboardVerticalOffset } = useHeaderKeyboardOffset();
 *   <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={keyboardVerticalOffset}>
 */
export function useHeaderKeyboardOffset() {
    const { top } = useSafeAreaInsets();

    const keyboardVerticalOffset = Platform.OS === 'ios' ? top : 0;

    return { keyboardVerticalOffset };
}
