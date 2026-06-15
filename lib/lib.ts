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

export const getImageUrl = (imagePath: string) => {
    if (!imagePath) return null;

    if (imagePath.includes('http')) {
        return imagePath;
    }

    return `${process.env.EXPO_PUBLIC_IMAGE_PREFIX}${imagePath}`;
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

