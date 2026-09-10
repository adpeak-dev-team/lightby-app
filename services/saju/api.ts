import { apiClient } from '@/api/apiClient';
import type {
    SavedMatchTarget,
    DailyResponse,
    MatchInput,
    MatchResponse,
    MonthlyResponse,
    NatalResponse,
    SajuProfile,
    SajuProfileInput,
    SajuAccess,
    SajuRegion,
} from './types';

interface Envelope<T> {
    success: boolean;
    data: T;
}

/** 진태양시 보정용 지역 목록. 로그인 없이도 폼을 그릴 수 있어야 해서 공개 API 다. */
export const getSajuRegions = async (): Promise<SajuRegion[]> => {
    const { data } = await apiClient.get<Envelope<SajuRegion[]>>('/saju/regions');
    return data.data;
};

export const getSajuProfile = async (): Promise<SajuProfile> => {
    const { data } = await apiClient.get<Envelope<SajuProfile>>('/saju/profile');
    return data.data;
};

/** 회원 정보에 없는 값만 저장한다(역법·윤달·시각·지역). 저장 후 최신 프로필을 돌려준다. */
export const saveSajuProfile = async (input: SajuProfileInput): Promise<SajuProfile> => {
    const { data } = await apiClient.post<Envelope<SajuProfile>>('/saju/profile', input);
    return data.data;
};

/**
 * 오늘의 운세. offset 은 -1(어제) / 0(오늘) / 1(내일) 만 받는다.
 * **오늘만 서버에 기록·동결된다** — 어제·내일은 스트립 미리보기라 매번 계산만 한다.
 */
export const getSajuDaily = async (offset = 0): Promise<DailyResponse> => {
    const { data } = await apiClient.get<Envelope<DailyResponse>>('/saju/today', {
        params: { offset },
    });
    return data.data;
};

/**
 * 이번 달 운세. **이번 달만** 본다 — 서버가 다음 달을 아예 주지 않는다.
 * 오늘의 운세와 달리 서버에 기록되지 않는다 — 한 달 내내 같은 값이라 동결할 이유가 없다.
 */
export const getSajuMonthly = async (): Promise<MonthlyResponse> => {
    const { data } = await apiClient.get<Envelope<MonthlyResponse>>('/saju/monthly');
    return data.data;
};

/**
 * 영업 궁합.
 *
 * ⚠️ POST 인 이유 — 남의 생년월일이 URL·서버 로그에 남지 않게 하기 위함이다.
 *    서버도 저장하지 않고 계산만 한다.
 */
export const postSajuMatch = async (input: MatchInput): Promise<MatchResponse> => {
    const { data } = await apiClient.post<Envelope<MatchResponse>>('/saju/match', input);
    return data.data;
};

/** 사주 원국 — 명식과 해석 문구를 서버가 조립해서 준다. */
export const getSajuNatal = async (): Promise<NatalResponse> => {
    const { data } = await apiClient.get<Envelope<NatalResponse>>('/saju/natal');
    return data.data;
};

/**
 * 유료 항목의 이용 상태. **차감하지 않는다.**
 * 화면이 "990P 가 차감됩니다" 를 그리고 확인을 받은 뒤에 실제 조회를 부르게 하려는 것.
 */
export const getSajuAccess = async (): Promise<SajuAccess[]> => {
    const { data } = await apiClient.get<Envelope<SajuAccess[]>>('/saju/access');
    return data.data;
};

/** 궁합 이용 상태 — **차감하지 않는다.** 이 상대가 얼마인지, 이미 본 상대인지만 묻는다. */
export const postMatchAccess = async (input: MatchInput): Promise<SajuAccess> => {
    const { data } = await apiClient.post<Envelope<SajuAccess>>('/saju/match/access', input);
    return data.data;
};

export const getSavedMatchTargets = async (): Promise<SavedMatchTarget[]> => {
    const { data } = await apiClient.get<Envelope<SavedMatchTarget[]>>('/saju/match/saved');
    return data.data;
};

export const deleteSavedMatchTarget = async (id: number): Promise<void> => {
    await apiClient.delete(`/saju/match/saved/${id}`);
};
