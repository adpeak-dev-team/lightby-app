import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * 화면을 덮고 있는 키보드의 높이(px). 숨겨져 있으면 0.
 *
 * KeyboardAvoidingView + keyboardVerticalOffset 조합은 KAV의 프레임을 부모 기준으로
 * 재기 때문에 SafeAreaView·헤더 구성에 따라 보정값이 달라져 어긋나기 쉽다.
 * 이 훅은 키보드 높이를 그대로 돌려주므로, 하단 입력바에 그만큼 여백을 주면
 * 화면 구조와 무관하게 항상 키보드 바로 위에 붙는다.
 *
 * iOS는 will* 이벤트를 써서 키보드 애니메이션과 함께 움직이게 한다.
 */
export function useKeyboardHeight(): number {
    const [height, setHeight] = useState(0);

    useEffect(() => {
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const show = Keyboard.addListener(showEvent as any, (e: any) => {
            setHeight(e?.endCoordinates?.height ?? 0);
        });
        const hide = Keyboard.addListener(hideEvent as any, () => setHeight(0));

        return () => { show.remove(); hide.remove(); };
    }, []);

    return height;
}
