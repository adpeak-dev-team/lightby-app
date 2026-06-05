import { useCallback, useState } from 'react';
import { tokenStorage } from '@/api/apiClient';
import { LoginPromptModal } from '@/components/common/LoginPromptModal';

/**
 * 비회원 보호 동작 헬퍼.
 * requireLogin(action)을 호출하면 토큰이 있을 때만 action 실행, 없으면 로그인 유도 모달 표시.
 * 화면에는 반환된 loginPrompt 엘리먼트를 렌더링한다.
 */
export function useRequireLogin(message?: string) {
  const [visible, setVisible] = useState(false);

  const requireLogin = useCallback(async (action: () => void) => {
    const token = await tokenStorage.get();
    if (!token) {
      setVisible(true);
      return;
    }
    action();
  }, []);

  const loginPrompt = (
    <LoginPromptModal visible={visible} onClose={() => setVisible(false)} message={message} />
  );

  return { requireLogin, loginPrompt };
}
