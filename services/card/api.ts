import { apiClient, UPLOAD_TIMEOUT_MS } from '@/api/apiClient';
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

    // ⚠️ Content-Type 을 **직접 박아야 한다.** axios 는 FormData 를 만나면 헤더를 지워
    //    런타임이 boundary 를 붙이게 두는데, 그 분기가 브라우저 환경(hasStandardBrowserEnv)
    //    에서만 돈다. RN 에서는 타지 않아 헤더가 엉뚱하게 붙고 서버는 파일을 못 찾는다.
    //    boundary 는 OkHttp 가 알아서 채운다 — 여기서 만들지 않는다.
    //    (회원 프로필 사진 업로드가 같은 이유로 이렇게 되어 있다)
    const { data } = await apiClient.post<Envelope<{ photoPath: string }>>('/card/photo', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: UPLOAD_TIMEOUT_MS, // 사진은 느린 망에서 20초를 넘길 수 있다
    });

    // 서버는 파일을 못 찾으면 **200 에 success:false** 로 답한다(에러가 아니다).
    // 그대로 두면 data.data 가 없어 엉뚱한 TypeError 가 나고, 화면에는 진짜 이유 대신
    // "다시 시도해 주세요" 만 뜬다.
    if (!data?.success || !data.data?.photoPath) {
        throw new Error(
            (data as unknown as { message?: string })?.message ?? '사진을 저장하지 못했습니다.',
        );
    }
    return data.data.photoPath;
};
