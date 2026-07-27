// "1.0.5" vs "1.0.10" 처럼 점 구분 버전을 숫자 단위로 비교한다.
// a<b → 음수, a==b → 0, a>b → 양수. (문자열 비교로 하면 "1.0.10" < "1.0.5" 오판)
export function compareVersions(a: string, b: string): number {
    const pa = String(a ?? '').split('.').map((n) => parseInt(n, 10) || 0);
    const pb = String(b ?? '').split('.').map((n) => parseInt(n, 10) || 0);
    const len = Math.max(pa.length, pb.length);
    for (let i = 0; i < len; i++) {
        const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
        if (diff !== 0) return diff;
    }
    return 0;
}

/** current 가 min 보다 낮으면(=강제 업데이트 필요) true */
export function isBelow(current: string, min: string): boolean {
    return compareVersions(current, min) < 0;
}
