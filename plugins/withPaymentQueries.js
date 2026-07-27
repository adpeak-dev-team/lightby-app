const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

const PAYMENT_SCHEMES = [
  'kakaotalk',
  'kakaopay',
  'kftc-bankpay',
  'ispmobile',
  'cloudpay',
  'payco',
  'paycoapp',
  'com.samsung.spay',
  'shinhan-sr-ansimclick',
  'smshinhanansimclick',
  'kb-acp',
  'mpocket.online.ansimclick',
  'hdcardappcardansimclick',
  'smhyundaiansimclick',
  'lottesmartpay',
  'lotteappcard',
  'nhappcardansimclick',
  'wooripay',
  'wooricard',
  'citispay',
  'citimobileapp',
  'hanawalletmembers',
  'hanaskcardmobileportal',
  'nonghyupcardansimclick',
  'supay',
  'market',
];

// intent://...#Intent;package=xxx;end 형태에서 package= 조회 대응.
const PAYMENT_PACKAGES = [
  'com.samsung.android.spay',
  'com.samsung.android.spaylite',
  'com.nhnent.payapp',
  'kvp.jjy.MispAndroid320',
  'com.kakaopay.app',
  'com.kakao.talk',
  'com.kbcard.kbkookmincard',
  'com.kbcard.cxh.appcard',
  'com.shcard.smartpay',
  'com.hyundaicard.appcard',
  'com.lcacApp',
  'com.lotte.lpay',
  'com.wooricard.wpay',
  'com.wooricard.smartapp',
  'com.hanaskcard.paycla',
  'com.hanaskcard.rocomo.potal',
  'nh.smart.card',
  'nh.smart.nhallonepay',
  'com.citibank.cardapp',
  'kr.co.citibank.citimobile',
  'viva.republica.toss',
  'com.tossbiz.tossbiz',
  'com.nhn.android.search',
  'com.mysmilepay.app',
];

module.exports = function withPaymentQueries(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    // QUERY_ALL_PACKAGES 권한 추가 — 결제앱 종류가 많고 자주 바뀌어서 화이트리스트가 실질적으로 불가.
    if (!Array.isArray(manifest['uses-permission'])) manifest['uses-permission'] = [];
    const hasPerm = manifest['uses-permission'].some(
      (p) => p?.$?.['android:name'] === 'android.permission.QUERY_ALL_PACKAGES',
    );
    if (!hasPerm) {
      manifest['uses-permission'].push({
        $: {
          'android:name': 'android.permission.QUERY_ALL_PACKAGES',
          'tools:ignore': 'QueryAllPackagesPermission',
        },
      });
    }

    if (!Array.isArray(manifest.queries)) manifest.queries = [{}];
    const queries = manifest.queries[0];
    if (!Array.isArray(queries.intent)) queries.intent = [];
    if (!Array.isArray(queries.package)) queries.package = [];

    for (const scheme of PAYMENT_SCHEMES) {
      const dup = queries.intent.some((it) =>
        Array.isArray(it.data) && it.data.some((d) => d?.$?.['android:scheme'] === scheme),
      );
      if (dup) continue;
      queries.intent.push({
        action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
        data: [{ $: { 'android:scheme': scheme } }],
      });
    }

    for (const pkg of PAYMENT_PACKAGES) {
      const dup = queries.package.some((p) => p?.$?.['android:name'] === pkg);
      if (dup) continue;
      queries.package.push({ $: { 'android:name': pkg } });
    }

    return cfg;
  });
};
