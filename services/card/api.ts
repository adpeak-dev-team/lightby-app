import { apiClient } from '@/api/apiClient';
import type { Card, CardListItem, CardPayload, IssuedShare, ShareLog } from './types';

interface Envelope<T> { success: boolean; data: T }

export const getCards = async (): Promise<CardListItem[]> => {
    const { data } = await apiClient.get<Envelope<CardListItem[]>>('/card');
    return data.data;
};

export const getCard = async (id: number): Promise<Card> => {
    const { data } = await apiClient.get<Envelope<Card>>(`/card/${id}`);
    return data.data;
};

export const createCard = async (payload: CardPayload): Promise<Card> => {
    const { data } = await apiClient.post<Envelope<Card>>('/card', payload);
    return data.data;
};

export const updateCard = async (id: number, payload: CardPayload): Promise<Card> => {
    const { data } = await apiClient.patch<Envelope<Card>>(`/card/${id}`, payload);
    return data.data;
};

export const deleteCard = async (id: number): Promise<void> => {
    await apiClient.delete(`/card/${id}`);
};

/**
 * 발송용 링크 발급 = 발송 1건.
 *
 * ⚠️ requestKey 는 **호출부가 미리 만들어** 넘긴다. 재시도로 두 번 발급되는 것을
 *    막는 유일한 장치라, 여기서 생성하면 재시도마다 새 키가 되어 의미가 없다.
 *    나중에 포인트 차감이 걸리면 이게 중복 차감 방지 키가 된다.
 */
export const issueShare = async (
    cardId: number,
    body: { requestKey: string; channel: ShareLog['channel']; memo?: string },
): Promise<IssuedShare> => {
    const { data } = await apiClient.post<Envelope<IssuedShare>>(`/card/${cardId}/share`, body);
    return data.data;
};

export const getShares = async (cardId: number): Promise<ShareLog[]> => {
    const { data } = await apiClient.get<Envelope<ShareLog[]>>(`/card/${cardId}/shares`);
    return data.data;
};

export const revokeShare = async (shareId: number): Promise<void> => {
    await apiClient.delete(`/card/share/${shareId}`);
};

/**
 * 명함 사진 업로드 — GCS 경로만 돌려준다.
 * 명함에 붙는 건 저장(create/update) 시점이라, 올리고 저장을 안 하면 그 파일은 버려진다.
 *
 * RN 에는 File 이 없다. 이미지 피커가 준 uri 를 그대로 FormData 에 넣으면
 * fetch 가 알아서 읽어 올린다(웹판과 다른 유일한 부분).
 */
export const uploadCardPhoto = async (asset: {
    uri: string;
    name?: string;
    type?: string;
}): Promise<string> => {
    const form = new FormData();
    form.append('photo', {
        uri: asset.uri,
        name: asset.name ?? asset.uri.split('/').pop() ?? 'photo.jpg',
        type: asset.type ?? 'image/jpeg',
    } as unknown as Blob);
    const { data } = await apiClient.post<Envelope<{ photoPath: string }>>('/card/photo', form);
    return data.data.photoPath;
};
