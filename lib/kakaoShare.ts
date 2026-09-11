import { shareFeedTemplate } from '@react-native-kakao/share';

/**
 * 카카오톡 공유 (네이티브 Kakao SDK).
 *
 * OS 공유 시트로 텍스트만 던지면 카카오톡이 링크를 긁어 OG 미리보기를 만든다 —
 * 제목·설명·썸네일을 우리가 못 고르고, **"명함 보기" 버튼도 출처 표기도 없다.**
 * 받는 사람이 보는 첫 화면이 명함 장사의 전부라, 여기만은 카카오 SDK 로 직접 그린다.
 * (웹의 lib/kakaoShare.ts 와 같은 피드 템플릿이다 — 양쪽이 같은 말풍선으로 나가야 한다)
 *
 * ⚠️ 알아둘 것:
 *
 * 1. **전송 결과를 알려주지 않는다.** 카카오톡을 열어 줄 뿐, 실제로 보냈는지 취소했는지
 *    돌려주지 않는다. 그래서 발송 집계는 **링크 발급 시점**에 하고 여기서는 세지 않는다.
 * 2. **이미지는 카카오 서버가 직접 가져간다.** imageUrl 은 외부에서 접근 가능한 절대
 *    URL 이어야 한다. 우리 사진은 GCS 라 그대로 열린다.
 * 3. 카카오톡이 안 깔린 기기에서는 웹 공유창으로 대신 연다
 *    (useWebBrowserIfKakaoTalkNotAvailable).
 */
export interface KakaoCardShare {
    /** 받는 사람이 열 주소 — /card/{token} 절대 URL */
    url: string;
    /** 말풍선 제목 — "홍길동님의 명함을 확인해보세요" */
    title: string;
    /**
     * 둘째 줄. **없으면 넣지 않는다** —
     * 빈 문자열을 주면 카카오가 빈 줄을 그려 카드가 어정쩡해진다.
     */
    description?: string;
    /** 썸네일 절대 URL */
    imageUrl?: string;
}

/**
 * 명함 링크를 카카오톡 피드 메시지로 보낸다.
 *
 * 버튼을 하나만 두는 이유: 카카오는 버튼이 둘이면 둘 다 작게 나오는데,
 * 여기서 할 일은 "명함 보기" 하나뿐이다.
 */
export async function shareCardToKakao(card: KakaoCardShare): Promise<void> {
    const link = { mobileWebUrl: card.url, webUrl: card.url };

    await shareFeedTemplate({
        template: {
            content: {
                title: card.title,
                imageUrl: card.imageUrl ?? '',
                link,
                // 값이 없으면 키를 통째로 뺀다(빈 문자열이면 빈 줄이 남는다)
                ...(card.description ? { description: card.description } : {}),
            },
            buttons: [{ title: '명함 보기', link }],
        },
        useWebBrowserIfKakaoTalkNotAvailable: true,
    });
}
