import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { tokenStorage } from '@/api/apiClient';
import { isIapAvailable, recoverUnfinished } from '@/lib/iap';

/**
 * 결제는 됐는데 반영이 안 된 iOS 거래를 마무리한다.
 *
 * 결제 직후 앱이 꺼지거나 네트워크가 끊기면 거래가 끝나지 않은 채 남는다. Apple 은 그 거래를
 * 계속 들고 있으므로 앱을 켤 때·앞으로 돌아올 때 서버로 다시 보내면 된다(서버는 한 번만 지급한다).
 * 로그인 전에는 부르지 않는다 — 확정 API 가 로그인을 요구해 로그인 화면으로 튕길 수 있다.
 */
export function IapRecovery() {
    const qc = useQueryClient();

    useEffect(() => {
        if (!isIapAvailable) return;

        const run = async () => {
            if (!(await tokenStorage.get())) return;
            const results = await recoverUnfinished();
            if (results.length === 0) return;
            qc.invalidateQueries({ queryKey: ['point-balance'] });
            qc.invalidateQueries({ queryKey: ['point-history'] });
            if (results.some((r) => r.kind === 'post')) qc.invalidateQueries();
        };

        void run();
        const sub = AppState.addEventListener('change', (s) => { if (s === 'active') void run(); });
        return () => sub.remove();
    }, [qc]);

    return null;
}
