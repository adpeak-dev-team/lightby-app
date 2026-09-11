// 아이디 검증 함수 (영어, 숫자, 언더바만 가능)
export const validateId = (id: string) => {
    const regex = /^[A-Za-z0-9_]+$/;
    return regex.test(id);
};

// 문자 검증 함수 (특수문자 및 공백 제외: 한글, 영문자, 숫자만 허용)
export const validateLetter = (name: string) => {
    const regex = /^[가-힣ㄱ-ㅎㅏ-ㅣA-Za-z0-9]+$/;
    return regex.test(name);
};

// 휴대전화번호 검증 함수 (010-XXXX-XXXX 형식, 10~11자리)
export const validatePhone = (phone: string) => {
    const nums = phone.replace(/\D/g, "");
    return /^01[0-9]\d{7,8}$/.test(nums);
};

// 비밀번호 검증 함수
// - 영문/숫자/특수문자 중 2가지 이상 조합, 8~20자
// - 3개 이상 연속된 문자/숫자 제외 (예: abc, 123)
// - 3개 이상 동일한 문자/숫자 반복 제외 (예: aaa, 111)
// - 아이디 포함 제외
export const validatePassword = (
    password: string,
    loginId: string = "",
): string | null => {
    if (password.length < 8 || password.length > 20) {
        return "비밀번호는 8~20자로 입력해주세요.";
    }

    const hasLetter = /[A-Za-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    const comboCount = [hasLetter, hasNumber, hasSpecial].filter(Boolean).length;
    if (comboCount < 2) {
        return "영문, 숫자, 특수문자 중 2가지 이상 조합해주세요.";
    }

    // 3개 이상 연속된 문자/숫자 (예: abc, cba, 123, 321)
    for (let i = 0; i < password.length - 2; i++) {
        const a = password.charCodeAt(i);
        const b = password.charCodeAt(i + 1);
        const c = password.charCodeAt(i + 2);
        if (b - a === 1 && c - b === 1)
            return "3개 이상 연속된 문자/숫자는 사용할 수 없습니다.";
        if (a - b === 1 && b - c === 1)
            return "3개 이상 연속된 문자/숫자는 사용할 수 없습니다.";
    }

    // 3개 이상 동일한 문자/숫자 반복 (예: aaa, 111)
    if (/(.)\1\1/.test(password)) {
        return "동일한 문자/숫자를 3개 이상 연속 사용할 수 없습니다.";
    }

    // 아이디 포함 여부
    if (loginId && password.toLowerCase().includes(loginId.toLowerCase())) {
        return "비밀번호에 아이디를 포함할 수 없습니다.";
    }

    return null;
};

// 휴대폰 번호에 하이픈(-) 넣기
export const formatPhoneNumber = (target: string) => {
    const nums = target.replace(/[^0-9]/g, "");
    if (nums.length <= 3) return nums;
    if (nums.length <= 7) return nums.replace(/(\d{3})(\d{1,4})/, "$1-$2");
    return nums.replace(/(\d{3})(\d{3,4})(\d{4})/, "$1-$2-$3");
};

// 특수문자 제거 함수(하이픈도 제거)
export const getPureNumbers = (target: string) => {
    return target.replace(/\D/g, "");
};

// 숫자를 시간 (분:초) 로 변환, 인증번호 만료 남은 시간에 쓰임
export const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

/**
 * 서버가 준 날짜 값 → 'YYYY-MM-DD' (한국 시각 기준).
 *
 * ⚠️ **앞 10자만 자르면 하루가 밀린다.**
 *    백엔드 mysql2 풀이 `timezone: '+09:00'` 이라, DATE 컬럼 `1990-10-25` 는
 *    "1990-10-25 00:00 KST" 인 Date 로 살아나고 JSON 으로는 UTC ISO
 *    `1990-10-24T15:00:00.000Z` 로 나간다. 여기서 slice(0,10) 하면 10-24 다.
 *
 * 기기 시간대에 맡기지 않고 **+09:00 으로 고정**한다. 서버가 그 시간대로 값을
 * 만들어 보내기 때문이고, 해외에 있는 사용자도 같은 날짜를 봐야 하기 때문이다.
 * (웹은 기기 시간대로 변환한다 — 한국 밖에서는 웹이 하루 밀린다)
 */
export const toDateString = (value: unknown): string => {
    if (!value) return '';
    const raw = String(value);

    // 이미 'YYYY-MM-DD' 면 그대로 쓴다 — 시간대를 다시 태울 이유가 없다
    const plain = /^(\d{4}-\d{2}-\d{2})(?:$|[T ])/.exec(raw);
    if (plain && !raw.includes('Z') && !/[+-]\d{2}:?\d{2}$/.test(raw)) return plain[1];

    const t = Date.parse(raw);
    if (Number.isNaN(t)) return plain ? plain[1] : '';

    const kst = new Date(t + 9 * 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${kst.getUTCFullYear()}-${pad(kst.getUTCMonth() + 1)}-${pad(kst.getUTCDate())}`;
};

export const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    const y = d.getFullYear().toString().slice(2);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${h}:${min}`;
};

// 배열 랜덤 섞는 함수 (main > premium / top 리스트 섞을때 사용)
export const shuffleList = <T>(array: T[]): T[] => {
    const combined = [...array]; // 원본 보존을 위해 복사본 생성

    for (let i = combined.length - 1; i > 0; i--) {
        // 0부터 i 사이의 랜덤 인덱스 선택
        const j = Math.floor(Math.random() * (i + 1));

        // 요소 맞바꾸기 (Destructuring assignment)
        [combined[i], combined[j]] = [combined[j], combined[i]];
    }

    return combined;
};

// 어드민 검색용~~~~~~!!!!! 주소의 쿼리 값 조절!!
// export function setParams(params, clear = false) {
//     const currentUrl = new URL(window.location.href);
//     const searchParams = new URLSearchParams(clear ? '' : currentUrl.search); // clear가 true면 초기화

//     // 새로운 파라미터 추가
//     for (const [key, value] of Object.entries(params)) {
//         if (value === undefined || value === null) {
//             searchParams.delete(key); // null 또는 undefined는 삭제
//         } else {
//             searchParams.set(key, value.toString()); // 값 추가
//         }
//     }

//     // URL 갱신
//     currentUrl.search = searchParams.toString();
//     console.log('Updated URL:', currentUrl.toString()); // 디버깅용

//     // URL 변경
//     goto(currentUrl.pathname + currentUrl.search, { replaceState: true, invalidateAll: true });
// }

// 토큰에서 role 가져오기
export const getUserRole = (): string | null => {
    const cookie = document.cookie
        .split('; ')
        .find((row) => row.startsWith('Authorization='))

    if (!cookie) return null

    const token = cookie.split('=')[1] // value 부분인 토큰만 추출

    if (!token) return null

    try {
        const payload = token.split('.')[1]
        const decodedPayload = JSON.parse(atob(payload))

        return decodedPayload.role || null
    } catch (error) {
        console.error('토큰 파싱 오류:', error)
        return null
    }
}

// 토큰에서 userId 가져오기
export const getUserId = (): string | null => {
    const cookie = document.cookie
        .split('; ')
        .find((row) => row.startsWith('Authorization='))

    if (!cookie) return null

    const token = cookie.split('=')[1] // value 부분인 토큰만 추출

    if (!token) return null

    try {
        const payload = token.split('.')[1]
        const decodedPayload = JSON.parse(atob(payload))

        return decodedPayload.userId || null
    } catch (error) {
        console.error('토큰 파싱 오류:', error)
        return null
    }
}

/**
 * 저장된 이미지 경로 → 화면에 쓸 주소.
 *
 * 두 종류가 섞여 들어온다:
 *  - GCS 상대 경로 (우리가 업로드한 것) → 접두사를 붙인다
 *  - 절대 URL (카카오 로그인 프로필 사진, k.kakaocdn.net) → 그대로 쓴다
 *
 * ⚠️ 절대 URL 에 접두사를 붙이면 `.../lightby/http://k.kakaocdn.net/...` 이 되어
 *    조용히 깨진다. 운영 DB 기준 프로필 사진의 **94%(249/264)가 카카오 절대 URL** 이라
 *    이걸 놓치면 대부분의 사용자가 빈 동그라미를 본다.
 *
 * ⚠️ 카카오가 주는 주소는 **http** 다. 릴리스 빌드에는 usesCleartextTraffic 이 없어
 *    안드로이드가 평문 HTTP 를 막는다 — 디버그에서만 보이고 스토어 빌드에서는 안 뜬다.
 *    같은 호스트가 https 로도 열리므로 올려서 쓴다.
 */
export const getImageUrl = (imagePath: string | null | undefined) => {
    if (!imagePath) return null;

    // startsWith 로 본다. includes('http') 는 경로 한가운데 'http' 가 들어간
    // 파일명까지 절대 URL 로 오해한다.
    if (/^https?:\/\//i.test(imagePath)) {
        return imagePath.replace(/^http:\/\//i, 'https://');
    }

    return `${process.env.EXPO_PUBLIC_IMAGE_PREFIX ?? ''}${imagePath}`;
}

// 백엔드 썸네일은 원본 파일명 앞에 'T' 접두사가 붙은 리사이즈본이다.
// (예: .../T1779522639754.png → 원본 .../1779522639754.png)
// 큰 영역(세로형/대형 썸네일)에 표시할 때는 'T'를 떼어 고해상도 원본을 사용한다.
export const getOriginalImageUrl = (url: string | null | undefined) => {
    if (!url) return null;
    return url.replace(/\/T(\d+\.[^/?#]+)(?=$|[?#])/, '/$1');
}

// 마감일 기준 D-day. 날짜 없거나 파싱 실패 시 null. (웹 lib/dday와 동일)
function getDday(endDate?: string | null): number | null {
    if (!endDate) return null;
    const end = new Date(endDate);
    if (Number.isNaN(end.getTime())) return null;
    end.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((end.getTime() - today.getTime()) / 86_400_000);
}

// 공고 마감일 = 생성일 + N일(기본 10일)로 간주하고 D-day 계산.
export function ddayFromCreatedAt(createdAt?: string | null, durationDays = 10): number | null {
    if (!createdAt) return null;
    const end = new Date(createdAt);
    if (Number.isNaN(end.getTime())) return null;
    end.setDate(end.getDate() + durationDays);
    return getDday(end.toISOString());
}

