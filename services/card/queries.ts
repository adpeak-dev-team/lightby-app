import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
    createCard, deleteCard, getCard, getCards, getShares,
    issueShare, revokeShare, updateCard,
} from './api';
import type { CardPayload, ShareLog } from './types';

export const CARD_QUERY_KEYS = {
    list: ['cards'] as const,
    one: (id: number) => ['card', id] as const,
    shares: (id: number) => ['card-shares', id] as const,
};

export const useCards = () =>
    useQuery({
        queryKey: CARD_QUERY_KEYS.list,
        queryFn: getCards,
        retry: false,
    });

export const useCard = (id: number | null) =>
    useQuery({
        queryKey: CARD_QUERY_KEYS.one(id ?? 0),
        queryFn: () => getCard(id as number),
        enabled: id !== null,
        retry: false,
    });

export const useShares = (id: number | null) =>
    useQuery({
        queryKey: CARD_QUERY_KEYS.shares(id ?? 0),
        queryFn: () => getShares(id as number),
        enabled: id !== null,
        retry: false,
    });

export const useCreateCard = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: CardPayload) => createCard(payload),
        onSuccess: () => qc.invalidateQueries({ queryKey: CARD_QUERY_KEYS.list }),
    });
};

export const useUpdateCard = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: CardPayload }) => updateCard(id, payload),
        onSuccess: (card) => {
            qc.setQueryData(CARD_QUERY_KEYS.one(card.id), card);
            qc.invalidateQueries({ queryKey: CARD_QUERY_KEYS.list });
        },
    });
};

export const useDeleteCard = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => deleteCard(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: CARD_QUERY_KEYS.list }),
    });
};

/**
 * 발송용 링크 발급.
 *
 * ⚠️ `requestKey` 는 **호출부에서 만들어** 넘긴다. react-query 의 자동 재시도나
 *    사용자의 재클릭으로 두 번 발급되는 것을 막는 유일한 장치라, 여기서 만들면
 *    매 시도마다 새 키가 되어 의미가 없다. 그래서 이 훅은 retry 를 끈다.
 */
export const useIssueShare = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (args: { cardId: number; requestKey: string; channel: ShareLog['channel']; memo?: string }) =>
            issueShare(args.cardId, { requestKey: args.requestKey, channel: args.channel, memo: args.memo }),
        retry: false,
        onSuccess: (_data, args) => {
            qc.invalidateQueries({ queryKey: CARD_QUERY_KEYS.shares(args.cardId) });
            qc.invalidateQueries({ queryKey: CARD_QUERY_KEYS.list });
        },
    });
};

export const useRevokeShare = (cardId: number) => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (shareId: number) => revokeShare(shareId),
        onSuccess: () => qc.invalidateQueries({ queryKey: CARD_QUERY_KEYS.shares(cardId) }),
    });
};
