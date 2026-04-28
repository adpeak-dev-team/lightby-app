# Expo + 카카오 로그인 안드로이드 빌드 트러블슈팅 기록

> `lightby-app` 프로젝트에서 `npx expo run:android` 실행 시 발생한 문제들과 해결 과정 정리

---

## 🎯 최종 환경

- Expo (CNG 방식, prebuild 사용)
- Kotlin 2.0.21
- KSP 2.0.21-1.0.28
- @react-native-seoul/kakao-login 5.4.2

---

## 📋 발생한 문제 순서대로 정리

### 1️⃣ Kotlin 1.9.0 → KSP 호환 에러

**에러 메시지**
```
Can't find KSP version for Kotlin version '1.9.0'.
Supported versions are: '2.2.20, 2.2.10, 2.2.0, 2.1.21, 2.1.20, 2.1.10, 2.1.0, 2.0.21, ...'
```

**원인**
- `app.json`의 `@react-native-seoul/kakao-login` 플러그인 옵션에 `kotlinVersion: "1.9.0"`이 명시되어 있었음
- 다른 의존성(KSP 사용)은 Kotlin 2.0+ 요구 → 충돌

**해결**
- 플러그인 옵션에서 `kotlinVersion` 제거
- 옛날 라이브러리 가이드를 따르면 1.9.0 명시하라고 되어있는데, 이건 outdated 가이드

---

### 2️⃣ Kotlin 1.5.10 → 더 낮은 버전으로 박힘

**에러 메시지**
```
Can't find KSP version for Kotlin version '1.5.10'.
```

**원인 추적 과정**
1. `android/gradle.properties`에 `android.kotlinVersion=1.5.10`이 직접 박혀 있었음
2. 그 줄을 지워도 `prebuild` 후 다시 자동 생성됨
3. `grep -r "1.5.10" node_modules` 으로 추적 → 범인 찾음:
   ```
   node_modules/@react-native-seoul/kakao-login/plugins/android/withAndroidKakaoLogin.js
   ```
4. 즉, 카카오 로그인 라이브러리의 config plugin이 자동으로 `gradle.properties`에 1.5.10을 주입하고 있었음

**해결 — `app.json`에 `expo-build-properties`로 덮어쓰기**
```json
[
  "expo-build-properties",
  {
    "android": {
      "kotlinVersion": "2.0.21"
    }
  }
]
```

⚠️ **주의 사항**
- 플러그인 순서 중요: `expo-build-properties`를 `@react-native-seoul/kakao-login` **뒤에** 두기
- 플러그인은 위에서 아래로 적용되므로 뒤에 있을수록 덮어씀
- `app.json` 수정 후 반드시 `prebuild --clean` 필요

---

### 3️⃣ 플러그인 형식 에러

**에러 메시지**
```
PluginError: Plugin is an unexpected object, with keys: "android".
```

**원인**
- 플러그인 옵션을 줄 때 대괄호 `[]`로 감싸지 않음

**해결**
```json
❌ 잘못된 형식
{
  "expo-build-properties": {
    "android": { "kotlinVersion": "2.0.21" }
  }
}

✅ 올바른 형식
[
  "expo-build-properties",
  {
    "android": { "kotlinVersion": "2.0.21" }
  }
]
```

**규칙**
- 옵션 없는 플러그인: 그냥 문자열 → `"expo-router"`
- 옵션 있는 플러그인: 배열 → `["plugin-name", { options }]`

---

### 4️⃣ 한글 프로젝트 이름 깨짐

**증상**
```
A problem occurred evaluating root project '踰덇컻遺꾩뼇'.
```

**원인**
- `app.json`의 `name` 또는 다른 곳에 한글이 들어가 있어서 인코딩 깨짐

**해결**
- `app.json`의 `name`, `slug`는 영문으로 (`lightby-app`)
- 사용자에게 보이는 앱 이름은 `strings.xml`의 `app_name`에서 한글 가능

---

### 5️⃣ Android SDK 경로 못 찾음

**에러 메시지**
```
SDK location not found. Define a valid SDK location with an ANDROID_HOME 
environment variable or by setting the sdk.dir path in your project's 
local properties file
```

**원인**
- `ANDROID_HOME` 환경변수 미설정
- `android/local.properties` 파일 없음

**해결 방법 1 — local.properties (프로젝트별)**
```properties
sdk.dir=C:\\Users\\사용자명\\AppData\\Local\\Android\\Sdk
```
⚠️ 백슬래시 두 개씩 (`\\`)

**해결 방법 2 — 환경변수 (영구적, 권장)**
1. Win 키 → "환경 변수" 검색 → 시스템 환경 변수 편집
2. 사용자 변수 새로 만들기:
   - `ANDROID_HOME` = `C:\Users\사용자명\AppData\Local\Android\Sdk`
3. Path에 추가:
   - `%ANDROID_HOME%\platform-tools`
   - `%ANDROID_HOME%\emulator`
   - `%ANDROID_HOME%\tools`
   - `%ANDROID_HOME%\tools\bin`
4. **CMD/터미널 완전히 종료 후 재시작 필수!**

---

### 6️⃣ 카카오 SDK 다운로드 실패

**에러 메시지**
```
Could not find com.kakao.sdk:v2-user:2.20.1.
Could not find com.kakao.sdk:v2-talk:2.20.1.
Could not find com.kakao.sdk:v2-story:2.17.0.
```

**원인**
- 카카오 Android SDK는 **카카오 전용 Maven 저장소**에 호스팅
- Gradle이 그곳을 모르고 있음

**해결 — `app.json`에 카카오 저장소 추가**
```json
[
  "expo-build-properties",
  {
    "android": {
      "kotlinVersion": "2.0.21",
      "extraMavenRepos": [
        "https://devrepo.kakao.com/nexus/content/groups/public/"
      ]
    }
  }
]
```

---

## ✅ 최종 app.json plugins 설정

```json
"plugins": [
  "expo-router",
  [
    "expo-splash-screen",
    {
      "image": "./assets/images/splash-icon.png",
      "imageWidth": 200,
      "resizeMode": "contain",
      "backgroundColor": "#ffffff",
      "dark": {
        "backgroundColor": "#000000"
      }
    }
  ],
  "expo-secure-store",
  [
    "@react-native-seoul/kakao-login",
    {
      "kakaoAppKey": "카카오_네이티브_앱_키"
    }
  ],
  [
    "expo-build-properties",
    {
      "android": {
        "kotlinVersion": "2.0.21",
        "extraMavenRepos": [
          "https://devrepo.kakao.com/nexus/content/groups/public/"
        ]
      }
    }
  ]
]
```

---

## 🚀 깨끗하게 재빌드하는 순서

```bash
# 1. 기존 android 폴더 삭제
rmdir /s /q android

# 2. node_modules도 삭제 (필요시)
rmdir /s /q node_modules
del package-lock.json

# 3. 의존성 재설치
npm install

# 4. prebuild로 android 폴더 새로 생성
npx expo prebuild --clean

# 5. 빌드 & 실행
npx expo run:android
```

---

## 🔍 디버깅 시 유용했던 명령어

```bash
# Kotlin 버전 확인
type android\gradle.properties | findstr kotlin

# 카카오 저장소 적용 확인
findstr /s "devrepo.kakao" android\*.gradle

# 환경변수 확인
echo %ANDROID_HOME%
echo %USERNAME%

# adb 위치 확인
where adb

# 폰 연결 확인
adb devices

# 라이브러리 버전 확인
npm list @react-native-seoul/kakao-login

# 특정 문자열 검색 (Git Bash)
grep -r "1.5.10" node_modules --include="*.js" -l
```

---

## 💡 핵심 교훈

1. **`android/` 폴더는 직접 수정 금지** — `prebuild` 시 사라지거나 충돌 발생
2. **모든 빌드 설정은 `app.json`에서 관리** — `expo-build-properties` 플러그인 활용
3. **플러그인 순서가 중요** — 뒤에 오는 플러그인이 앞의 설정을 덮어씀
4. **node_modules의 config plugin이 빌드 파일을 자동 주입할 수 있음** — 문제 추적 시 `grep`으로 찾기
5. **Git에 올리지 말 것**:
   - `android/`
   - `node_modules/`
   - `.env`
   - `local.properties`
6. **다른 PC에서 작업 시작할 때**:
   ```bash
   git clone <repo>
   npm install
   npx expo prebuild --clean
   # local.properties 또는 ANDROID_HOME 설정
   npx expo run:android
   ```

---

## 📚 참고 — 카카오 콘솔 설정 체크리스트

빌드 성공 후 카카오 로그인이 실제로 동작하려면:

- [ ] 카카오 디벨로퍼스 콘솔에 앱 등록
- [ ] 패키지명 등록 (`com.lightby.app`)
- [ ] 디버그 키 해시 등록
- [ ] 릴리즈 키 해시 등록 (배포 시)
- [ ] 카카오 로그인 활성화
- [ ] Redirect URI 등록 (필요 시)

**키 해시 추출 명령어** (Windows)
```bash
keytool -exportcert -alias androiddebugkey -keystore %USERPROFILE%\.android\debug.keystore -storepass android -keypass android | openssl sha1 -binary | openssl base64
```

---

*마지막 업데이트: 2026-04-28*
