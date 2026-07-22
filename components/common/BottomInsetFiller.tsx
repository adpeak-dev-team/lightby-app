import { View, StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';

/**
 * edge-to-edge 에서 시스템 내비게이션 바 영역을 화면 배경색으로 덮는 채움용 뷰.
 *
 * ⚠️ 키보드가 올라오면 루트 레이아웃(app/_layout.tsx)이 키보드 높이만큼 화면을 줄이므로
 *    이 뷰의 기준점도 키보드 바로 위로 올라온다. 높이를 그대로 두면 키보드 위에
 *    정체불명의 흰 띠가 보인다. 키보드가 떠 있는 동안엔 내비바 자체가 키보드에
 *    가려지므로 높이를 0으로 접는다.
 */
export function BottomInsetFiller({ style }: { style?: StyleProp<ViewStyle> }) {
  const insets = useSafeAreaInsets();
  const kbHeight = useKeyboardHeight();

  return (
    <View
      style={[
        { backgroundColor: '#fff' },
        style,
        { height: kbHeight > 0 ? 0 : insets.bottom },
      ]}
    />
  );
}
