import { forwardRef } from 'react';
import { Text as RNText, type TextProps, type Text as RNTextRef } from 'react-native';

/**
 * 앱 전역 기본 Text.
 * 한글이 글자 단위로 끊기지 않고 단어(어절) 단위로 줄바꿈되도록 줄바꿈 전략을 기본 적용한다.
 *  - iOS: lineBreakStrategyIOS="hangul-word" (한글 단어 우선)
 *  - Android: textBreakStrategy="simple" (공백에서만 줄바꿈)
 * 각 사용처에서 prop을 직접 지정하면 그 값이 우선한다.
 */
export const Text = forwardRef<RNTextRef, TextProps>(function Text(props, ref) {
  return (
    <RNText
      textBreakStrategy="simple"
      lineBreakStrategyIOS="hangul-word"
      {...props}
      ref={ref}
    />
  );
});
