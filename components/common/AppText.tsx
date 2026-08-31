import { forwardRef } from 'react';
import { StyleSheet, Text as RNText, type TextProps, type Text as RNTextRef } from 'react-native';

/**
 * 앱 전역 기본 Text.
 *
 * 1) 한글이 글자 단위로 끊기지 않고 단어(어절) 단위로 줄바꿈되도록 줄바꿈 전략을 기본 적용한다.
 *    - iOS: lineBreakStrategyIOS="hangul-word" (한글 단어 우선)
 *    - Android: textBreakStrategy="simple" (공백에서만 줄바꿈)
 * 2) 웹(Pretendard)과 동일한 폰트를 기본값으로 준다.
 *    RN은 폰트가 상속되지 않아 Text마다 지정해야 하는데, 예전에 쓰던 Text.defaultProps 주입은
 *    React 19에서 함수 컴포넌트 defaultProps 지원이 제거되어 더 이상 동작하지 않는다.
 *    (폰트 로드에 실패해도 OS 기본 폰트로 안전하게 폴백된다.)
 * 3) allowFontScaling=false — 단말 시스템 글꼴 크기 설정을 따라가지 않는다.
 *    글자만 커지면 고정 높이/nowrap/line-clamp 영역이 깨지므로 레이아웃을 우선한다.
 *
 * 각 사용처에서 prop을 직접 지정하면 그 값이 우선한다(style은 기본값 위에 병합된다).
 */
export const Text = forwardRef<RNTextRef, TextProps>(function Text(
  { style, ...props },
  ref,
) {
  return (
    <RNText
      textBreakStrategy="simple"
      lineBreakStrategyIOS="hangul-word"
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
