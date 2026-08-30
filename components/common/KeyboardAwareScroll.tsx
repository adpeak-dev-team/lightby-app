import React, { createContext, useContext, useRef, forwardRef } from 'react';
import {
  ScrollView, ScrollViewProps, type TextInput, TextInputProps,
  findNodeHandle, Platform,
} from 'react-native';
import { TextInput as AppTextInput } from '@/components/common/AppTextInput';

type FocusHandler = NonNullable<TextInputProps['onFocus']>;
type FocusEvt = Parameters<FocusHandler>[0];

// multiline(textarea)는 RN iOS의 "포커스 시 키보드 위로 스크롤" 내장 동작이 불안정하다.
// single-line은 RN이 내부적으로 scrollResponderScrollNativeHandleToKeyboard 를 호출해 잘 올라오는데,
// 키 큰 multiline은 이게 안 먹거나 캐럿을 못 따라간다.
// → 부모 ScrollView 를 context로 내려주고, multiline 포커스 시 "같은 내장 메커니즘"을 명시 호출해 해결.
//   (JS-only, 네이티브 의존성/리빌드 없음 → OTA 배포 가능)

type KeyboardAwareCtxValue = { scrollRef: React.RefObject<ScrollView | null> } | null;
const KeyboardAwareCtx = createContext<KeyboardAwareCtxValue>(null);

// 기존 ScrollView 를 그대로 대체(같은 props). 내부 ref를 context로 자식에게 공유한다.
export const KeyboardAwareScrollView = forwardRef<ScrollView, ScrollViewProps>(
  function KeyboardAwareScrollView(props, ref) {
    const scrollRef = useRef<ScrollView | null>(null);
    const setRef = (node: ScrollView | null) => {
      scrollRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as React.MutableRefObject<ScrollView | null>).current = node;
    };
    return (
      <KeyboardAwareCtx.Provider value={{ scrollRef }}>
        <ScrollView ref={setRef} {...props} />
      </KeyboardAwareCtx.Provider>
    );
  },
);

// multiline 전용 TextInput. 포커스 시 부모 ScrollView를 키보드 위로 스크롤한다.
// (single-line은 RN 내장 동작으로 충분하므로 이 컴포넌트를 쓸 필요 없음)
export const KeyboardAwareTextInput = forwardRef<TextInput, TextInputProps>(
  function KeyboardAwareTextInput(props, ref) {
    const ctx = useContext(KeyboardAwareCtx);
    const localRef = useRef<TextInput | null>(null);
    const setRef = (node: TextInput | null) => {
      localRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as React.MutableRefObject<TextInput | null>).current = node;
    };

    const handleFocus = (e: FocusEvt) => {
      props.onFocus?.(e);
      if (Platform.OS !== 'ios' || !ctx) return;
      // 키보드가 올라온 뒤 실행. 120 = 입력창을 키보드보다 이만큼 위로 띄우는 여백(라벨·상단 캐럿 노출용).
      setTimeout(() => {
        const sv = ctx.scrollRef.current as unknown as {
          getScrollResponder?: () => {
            scrollResponderScrollNativeHandleToKeyboard?: (
              node: number, additionalOffset: number, preventNegativeScrollOffset: boolean,
            ) => void;
          };
        } | null;
        const node = findNodeHandle(localRef.current);
        if (!sv || node == null) return;
        const responder = sv.getScrollResponder?.() ?? (sv as any);
        responder?.scrollResponderScrollNativeHandleToKeyboard?.(node, 120, true);
      }, 50);
    };

    return <AppTextInput ref={setRef} {...props} onFocus={handleFocus} />;
  },
);
