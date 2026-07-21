import { Redirect } from 'expo-router';

// 계정 설정은 /mypage/settings 로 통합되었습니다.
export default function AccountPage() {
  return <Redirect href={'/mypage/settings' as never} />;
}
