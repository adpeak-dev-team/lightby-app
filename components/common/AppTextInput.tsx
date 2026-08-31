import { forwardRef } from 'react';
import {
  StyleSheet,
  TextInput as RNTextInput,
  type TextInputProps,
  type TextInput as RNTextInputRef,
} from 'react-native';

/**
 * 앱 전역 기본 TextInput. [AppText]와 같은 기본값을 입력 필드에도 적용한다.
 *  - fontFamily: Pretendard (RN은 폰트 상속이 없어 컴포넌트마다 지정해야 한다)
 *  - allowFontScaling=false: 시스템 글꼴 크기 설정을 따라가지 않는다
 *    (입력 필드는 대부분 고정 높이라 글자만 커지면 잘린다. placeholder에도 함께 적용된다.)
 *
 * 각 사용처에서 prop을 직접 지정하면 그 값이 우선한다(style은 기본값 위에 병합된다).
 */
export const TextInput = forwardRef<RNTextInputRef, TextInputProps>(function TextInput(
  { style, ...props },
  ref,
) {
  return (
    <RNTextInput
      allowFontScaling={false}
      {...props}
      style={StyleSheet.compose(styles.base, style)}
      ref={ref}
    />
  );
});

const styles = StyleSheet.create({
  base: { fontFamily: 'Pretendard' },
});
