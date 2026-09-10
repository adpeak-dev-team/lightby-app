/**
 * 사주 API 응답 타입 — lightby-back `src/saju/` 의 응답 모양을 그대로 옮긴 것.
 *
 * ⚠️ 계산도 문구 조립도 전부 서버가 한다. 프론트는 렌더만 한다.
 *    (예전에는 이 폴더 옆에 lunar-javascript 계산기가 있었는데,
 *     유료화하면 번들에 로직이 들어 있어 결제 없이 결과를 만들 수 있어서 서버로 옮겼다.)
 */

export type CalendarType = 'solar' | 'lunar';

/** 진태양시 보정용 출생 지역 */
export interface SajuRegion {
    name: string;
    longitude: number;
}

/** 내 출생 정보 — users / user_profiles / saju_profiles 를 합친 것 */
export interface SajuProfile {
    name: string;
    gender: 'male' | 'female';
    /** user_profiles.birthday. 없으면 사주를 낼 수 없다 */
    birthday: { year: number; month: number; day: number } | null;
    hasBirthday: boolean;
    calendarType: CalendarType;
    isLeapMonth: boolean;
    birthTime: { hour: number; minute: number } | null;
    timeUnknown: boolean;
    birthRegion: string;
    /** saju_profiles 행이 이미 있는지 — 처음 들어온 사용자에게 안내를 띄우는 데 쓴다 */
    hasProfile: boolean;
}

/** 저장 요청 — 회원 정보에 **없는 것만** 보낸다 */
export interface SajuProfileInput {
    calendarType: CalendarType;
    isLeapMonth: boolean;
    /** 'HH:MM' — timeUnknown 이면 null */
    birthTime: string | null;
    timeUnknown: boolean;
    birthRegion: string | null;
}

// ── 오늘의 운세 ─────────────────────────────────────────────────────────────

export type SectionKey = 'total' | 'contract' | 'client' | 'relation' | 'money' | 'love';

export interface DailySection {
    key: SectionKey;
    label: string;
    emoji: string;
    text: string | null;
}

export interface DayPillar {
    ganIdx: number;
    jiIdx: number;
    ganKo: string;
    jiKo: string;
    ganzhiKo: string;
    ganzhiHanja: string;
}

export interface DailyFortune {
    dateKey: string;
    today: DayPillar;
    sipsin: string;
    tag: string;
    relation: string;
    relationLabel: string;
    relationText: string | null;
    score: number;
    sections: DailySection[];
    advice: string | null;
}

export interface DailyResponse {
    /** -1 어제 / 0 오늘 / 1 내일 */
    offset: number;
    /** 오늘 이미 본 결과를 그대로 받은 것인지 */
    cached: boolean;
    /** 기록·동결 대상인지 — 오늘(0)만 true */
    recorded: boolean;
    fortune: DailyFortune;
    myPillar: { ganzhiKo: string; ganKo: string; jiKo: string };
    daeun: {
        ganzhiKo: string;
        startYear: number;
        endYear: number;
        startAge: number;
        text: string | null;
    } | null;
    /** 포인트제 도입 전에는 항상 0 */
    pointCost: number;
}

// ── 이번 달 운세 ────────────────────────────────────────────────────────────

/** 좋은/조심할 시기 — 일자 구간 */
export interface DayRange {
    start: number;
    end: number;
    score: number;
}

export interface MonthlyResponse {
    /** 'YYYY-MM' */
    monthKey: string;
    monthPillar: { ganzhiKo: string; ganzhiHanja: string };
    yearPillar: { ganzhiKo: string; ganzhiHanja: string };
    myPillar: { ganzhiKo: string; ganKo: string; jiKo: string };
    sipsin: string;
    relation: string;
    relationLabel: string;
    score: number;
    sections: { key: string; label: string; emoji: string; text: string | null }[];
    /** 총운 뒤에 이어 붙일 마무리 문단 */
    closing: string | null;
    ranges: { contract: DayRange[]; money: DayRange[]; avoid: DayRange[] };
    /** 포인트제 도입 전에는 항상 0 */
    pointCost: number;
}

// ── 영업 궁합 ───────────────────────────────────────────────────────────────

export type MatchTargetKey = 'leader' | 'member' | 'peer' | 'partner' | 'etc';

/** 상대방 정보 — 서버는 계산만 하고 **저장하지 않는다** */
export interface MatchInput {
    name: string;
    target: MatchTargetKey;
    calendar: CalendarType;
    isLeapMonth: boolean;
    year: number;
    month: number;
    day: number;
    /** 'HH:MM' — 모르면 null. 일간·일지는 날짜만으로 정해져 결과에 큰 영향이 없다 */
    birthTime: string | null;
    gender: 'male' | 'female';
}

export interface MatchResponse {
    me: { name: string; ganzhiKo: string; ganKo: string };
    them: { name: string; ganzhiKo: string; ganKo: string; targetLabel: string };
    score: number;
    /** 십신은 방향이 있다 — 상대가 나에게 / 내가 상대에게 */
    theirsToMine: string;
    mineToTheirs: string;
    relation: string;
    relationLabel: string;
    complement: { mine: string[]; theirs: string[] };
    sections: { key: string; label: string; emoji: string; text: string | null }[];
    timeUnknown: boolean;
    pointCost: number;
}

// ── 원국 ────────────────────────────────────────────────────────────────────

export interface HiddenGan {
    ko: string;
    hanja: string;
    element: string;
    sipsin: string | null;
}

export interface Pillar {
    label: string;
    ganzhiKo: string;
    cheongan: { hanja: string; ko: string; element: string; sipsin: string | null };
    jiji: {
        hanja: string;
        ko: string;
        element: string;
        animal: string;
        unseong: string;
        jijanggan: HiddenGan[];
    };
    napeum: string;
}

export interface DaeunItem {
    startYear: number;
    endYear: number;
    startAge: number;
    ganzhiKo: string;
    element: string;
    isCurrent: boolean;
}

export interface TimeAdjustments {
    region: string;
    longitude: number;
    standardMeridian: number;
    dstApplied: boolean;
    dstMinutes: number;
    longitudeMinutes: number;
    equationOfTimeMinutes: number;
    totalShiftMinutes: number;
}

export interface SajuResult {
    ilgan: { ko: string; hanja: string; element: string; index: number };
    ttiAnimal: string;
    pillars: Pillar[];
    elementCounts: Record<string, number>;
    missingElements: string[];
    sipsinCounts: Record<string, number>;
    sinsal: string[];
    daeun: { startText: string; list: DaeunItem[] };
    resolved: {
        solarDate: { year: number; month: number; day: number };
        lunarDate: { year: number; month: number; day: number; isLeap: boolean };
        timeUnknown: boolean;
        clockTime: { hour: number; minute: number } | null;
        trueSolarTime: { hour: number; minute: number } | null;
        adjustments: TimeAdjustments | null;
        prevJieqi: string;
        nextJieqi: string;
        zisiRule: string;
    };
}

/** 서버가 saju_texts 에서 찾아 조립해 준 해석 문구 */
export interface NatalTexts {
    ilgan: { title: string | null; desc: string | null };
    elementStrong: { element: string; text: string | null } | null;
    elementLack: { element: string; text: string | null }[];
    yongsin: { element: string; text: string | null };
    topSipsin: { key: string; name: string | null; desc: string | null } | null;
    unseong: { key: string; desc: string | null; life: string | null } | null;
    sinsal: { key: string; name: string | null; desc: string | null }[];
    daeun: { sipsin: string; text: string | null } | null;
    summary: string | null;

    // ── 평생 총운 ──
    /** 일간 기준 — 돈 버는 방식 / 일하는 방식 / 사람 대하는 방식 */
    money: string | null;
    job: string | null;
    relationship: string | null;
    /** 대운을 연령대 흐름으로 바꾼 것 */
    decades: DecadeItem[];
    peak: LifePhase | null;
    caution: LifePhase | null;
}

export interface DecadeItem {
    /** '30대' — 구간 중간 나이 기준 */
    label: string;
    startAge: number;
    endAge: number;
    startYear: number;
    endYear: number;
    ganzhiKo: string;
    element: string;
    /** 5분류 십신 */
    sipsin: string;
    score: number;
    isCurrent: boolean;
    text: string | null;
}

export interface LifePhase {
    label: string;
    startAge: number;
    startYear: number;
    endYear: number;
    sipsin: string;
    text: string | null;
}

export interface NatalResponse {
    name: string;
    result: SajuResult;
    texts: NatalTexts;
}

/** 오행 순서 — 화면에서 막대 그래프를 그릴 때 쓴다 */
export const ELEMENTS = ['목', '화', '토', '금', '수'] as const;

/** 유료 사주 항목의 이용 상태. 차감 없이 조회만 하는 값이다. */
export interface SajuAccess {
    code: 'saju_monthly' | 'saju_life';
    label: string;
    /** 지금 가격(P). 0 이면 무료로 열어둔 상태 */
    cost: number;
    /** 이미 이용권이 있어 추가 차감 없이 볼 수 있는가 */
    owned: boolean;
    /** 'YYYY-MM'(그 달) 또는 'lifetime' */
    periodKey: string;
}

/** 내가 궁합을 본 상대. 이미 결제해서 다시 봐도 무료다. */
export interface SavedMatchTarget {
    id: number;
    name: string;
    /** 'YYYY-MM-DD' */
    birthDate: string;
    /** 'HH:mm' 또는 null */
    birthTime: string | null;
    calendar: 'solar' | 'lunar';
    gender: 'male' | 'female' | null;
    /** 마지막으로 결과를 연 시각 (KST 'YYYY-MM-DD HH:mm:ss') */
    viewedAt: string;
}
