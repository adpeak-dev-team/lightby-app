/**
 * 모바일 명함 API 타입 — lightby-back `src/card/` 의 응답 모양.
 *
 * 발송물은 이미지가 아니라 **링크**(`/card/{token}`)다. 서버가 토큰을 발급해야
 * 발송을 셀 수 있고(공유 SDK 는 전송 결과를 알려주지 않는다), 열람 추적도 거기서 나온다.
 */

export type TemplateId =
    | 'minimal' | 'navy' | 'lightning' | 'dark' | 'warm'
    | 'luxe' | 'aurora' | 'sidebar' | 'fresh' | 'photo';

export type PhotoStyle = 'id' | 'bust';

/** 명함 내용 — 저장 요청과 응답이 같은 모양이다 */
export interface CardPayload {
    title: string | null;
    templateId: TemplateId;
    name: string;
    position: string | null;
    company: string | null;
    siteName: string | null;
    phone: string | null;
    email: string | null;
    region: string | null;
    slogan: string | null;
    tags: string[];
    /** GCS 경로. 화면에 쓸 때는 getImageUrl() 로 전체 URL 을 만든다 */
    photoPath: string | null;
    photoStyle: PhotoStyle;
}

export interface Card extends CardPayload {
    id: number;
    createdAt: string;
    updatedAt: string;
}

export interface CardListItem extends Card {
    /** 이 명함으로 보낸 링크 수 / 그중 열람된 수 */
    stats: { sent: number; viewed: number };
}

export interface IssuedShare {
    token: string;
    /** 같은 requestKey 로 이미 발급된 것을 그대로 돌려준 경우 */
    reused: boolean;
    /** 포인트제 도입 전에는 항상 0 */
    pointCost: number;
}

export interface ShareLog {
    id: number;
    token: string;
    channel: 'kakao' | 'sms' | 'link' | 'image';
    memo: string | null;
    viewCount: number;
    firstViewedAt: string | null;
    lastViewedAt: string | null;
    revokedAt: string | null;
    createdAt: string;
    pointCost: number;
}

/** 공개 명함 — 로그인 없이 조회한다 */
export type PublicCardResult =
    | { status: 'ok'; card: Omit<CardPayload, 'title'> }
    | { status: 'deleted' | 'revoked' | 'expired' | 'notfound' };
