const { withMainActivity } = require('@expo/config-plugins');

/**
 * Play Store "열기" 버튼으로 앱을 최초 실행할 때, com.android.vending 이
 * intent 에 extras 를 심어서 넘긴다. 이 extras 가 JS 레이어(추정: expo-router
 * 초기 URL 파싱 또는 다른 모듈)에서 무한 대기를 유발해 스플래시가 안 내려가는
 * 문제가 발생했다. (아이콘 클릭 실행은 extras 없이 clean 하게 실행되어 정상)
 *
 * MainActivity.onCreate 진입 시점에 action=MAIN 이면서 extras 가 있으면
 * 그 extras 를 비워 React Native 로 넘어가지 않게 한다. 딥링크(data uri) 는
 * 건드리지 않아 lightbyapp:// 커스텀 스킴이나 App Links 흐름은 그대로 동작.
 */
module.exports = function withStripPlayStoreIntentExtras(config) {
  return withMainActivity(config, (cfg) => {
    let src = cfg.modResults.contents;

    // 이미 패치되어 있으면 스킵 (idempotent)
    if (src.includes('stripPlayStoreLauncherExtras')) return cfg;

    // 필요한 import 추가
    if (!src.includes('import android.content.Intent')) {
      src = src.replace(
        'import android.os.Build',
        'import android.content.Intent\nimport android.os.Build',
      );
    }

    // super.onCreate(null) 바로 앞에 삽입.
    // (@generated begin expo-splashscreen 블록 안에 넣으면 expo-splashscreen
    //  플러그인이 그 블록을 재생성할 때 삽입이 지워진다. super.onCreate 라인은
    //  안정적이라 여기에 붙인다. 실행 순서상으로도 RN 이 intent 를 보기 전이라 문제 없음.)
    const callMarker = 'super.onCreate(null)';
    if (src.includes(callMarker) && !src.includes('stripPlayStoreLauncherExtras()\n    super.onCreate')) {
      src = src.replace(
        callMarker,
        'stripPlayStoreLauncherExtras()\n    ' + callMarker,
      );
    }

    // MainActivity 클래스 내부에 helper 메서드 추가 (invokeDefaultOnBackPressed 앞에)
    const helperMarker = '  /**\n    * Align the back button behavior with Android S';
    const helperBody =
      '  /**\n' +
      '   * Play Store "열기" 실행 시 딸려오는 intent extras 를 초기화한다.\n' +
      '   * MAIN + LAUNCHER 인텐트에만 적용해 딥링크(data uri) 흐름은 보존.\n' +
      '   */\n' +
      '  private fun stripPlayStoreLauncherExtras() {\n' +
      '    val i = intent ?: return\n' +
      '    if (i.action == Intent.ACTION_MAIN && i.extras != null) {\n' +
      '      i.replaceExtras(null as android.os.Bundle?)\n' +
      '    }\n' +
      '  }\n\n';

    if (src.includes(helperMarker)) {
      src = src.replace(helperMarker, helperBody + helperMarker);
    }

    cfg.modResults.contents = src;
    return cfg;
  });
};
