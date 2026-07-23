// 카카오 주소 → 좌표(위경도) 지오코딩 공용 헬퍼.
// KakaoPostcode(주소 검색)와 이전 공고 불러오기/공고 수정처럼
// 주소만 있고 좌표가 없는 경로에서 공통으로 쓴다.
const REST_KEY = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY ?? '';

export async function geocodeAddress(
    address: string,
): Promise<{ lat: number; lng: number } | null> {
    const query = address.trim();
    if (!query) return null;
    try {
        const res = await fetch(
            `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}`,
            { headers: { Authorization: `KakaoAK ${REST_KEY}` } },
        );
        const json = await res.json();
        const doc = json.documents?.[0];
        if (!doc) return null;
        return { lat: parseFloat(doc.y), lng: parseFloat(doc.x) };
    } catch {
        return null;
    }
}
