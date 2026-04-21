import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface HeaderProps {
  isLoggedIn?: boolean;
  onLoginPress?: () => void;
  onLogoutPress?: () => void;
}

export default function Header({
  isLoggedIn = false,
  onLoginPress,
  onLogoutPress,
}: HeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      {/* 로고 */}
      <Image
        source={require('@/assets/images/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      {/* 로그인 / 로그아웃 버튼 */}
      {isLoggedIn ? (
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogoutPress}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.loginBtn} onPress={onLoginPress}>
          <Text style={styles.loginText}>로그인</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 4,
    width: '100%',
  },
  logo: {
    width: 100,
    height: 32,
  },
  loginBtn: {
    backgroundColor: '#38bdf8',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
  },
  loginText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  logoutBtn: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
  },
  logoutText: {
    color: '#64748b',
    fontWeight: '700',
    fontSize: 13,
  },
});
