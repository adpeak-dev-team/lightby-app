/**
 * 백엔드 에러 코드 (lightby-back: src/common/exception/error-code.ts 와 1:1 대응).
 *
 * 서버는 에러 응답 본문에 `errorCode`를 **숫자 문자열**로 내려준다:
 *   { success: false, statusCode: 401, errorCode: '10008', message: '...', userId: 3 }
 *
 * 열거형 이름('PHONE_AUTH_REQUIRED')과 비교하면 영원히 매치되지 않으므로
 * 반드시 이 상수를 쓸 것. (실제로 로그인 화면이 이 실수로 전화번호 인증 화면으로
 * 넘어가지 못하고 경고 문구만 띄우고 있었다)
 */
export const ERROR_CODES = {
  DUPLICATE_PHONE: '10001',
  INVALID_VERIFICATION_CODE: '10002',
  DUPLICATE_LOGIN_ID: '10003',
  DUPLICATE_NICKNAME: '10004',
  INVALID_CREDENTIALS: '10005',
  UNSUPPORTED_OAUTH_PROVIDER: '10006',
  OAUTH_FAILED: '10007',
  PHONE_AUTH_REQUIRED: '10008',

  EXPIRED_TOKEN: '90001',
  INVALID_TOKEN: '90002',
  INVALID_REFRESH_TOKEN: '90003',
  FILE_UPLOAD_FAILED: '90004',
} as const;
