import { View, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

const JS_KEY = process.env.EXPO_PUBLIC_KAKAO_JS_KEY ?? '';

function buildMapHTML(lat: number, lng: number, label: string) {
  const safeLabel = label.replace(/'/g, "\\'").replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>html,body,#map{width:100%;height:100%;margin:0;padding:0;}</style>
</head>
<body>
  <div id="map"></div>
  <script>
    (function() {
      function initMap() {
        kakao.maps.load(function() {
          try {
            var map = new kakao.maps.Map(document.getElementById('map'), {
              center: new kakao.maps.LatLng(${lat}, ${lng}),
              level: 4
            });
            map.setDraggable(false);
            map.setZoomable(false);
            var marker = new kakao.maps.Marker({
              position: new kakao.maps.LatLng(${lat}, ${lng}),
              map: map
            });
            ${label ? `
            var infowindow = new kakao.maps.InfoWindow({
              content: '<div style="padding:6px 10px;font-size:12px;white-space:nowrap;">${safeLabel}</div>'
            });
            infowindow.open(map, marker);
            ` : ''}
            if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_OK' }));
          } catch(e) {
            if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_ERROR', message: e.message }));
          }
        });
      }

      var script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=${JS_KEY}&autoload=false';
      script.onload = initMap;
      script.onerror = function() {
        if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_ERROR', message: 'SDK load failed' }));
      };
      document.head.appendChild(script);
    })();
  </script>
</body>
</html>`;
}

interface Props {
  latitude: number;
  longitude: number;
  label?: string;
  height?: number;
}

export function KakaoMap({ latitude, longitude, label = '', height = 200 }: Props) {
  // 웹에서는 react-native-webview 의 html source 가 동작하지 않아 iframe 으로 렌더
  if (Platform.OS === 'web') {
    return (
      <View style={[s.wrap, { height }]} pointerEvents="none">
        {/* @ts-ignore - 웹 전용 DOM iframe (react-native-web) */}
        <iframe
          srcDoc={buildMapHTML(latitude, longitude, label)}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="map"
        />
      </View>
    );
  }

  return (
    <View style={[s.wrap, { height }]} pointerEvents="none">
      <WebView
        // Android: 시스템 글꼴 크기 설정을 따라가지 않게 고정(앱 전역 정책과 동일). iOS는 무시됨.
        textZoom={100}
        source={{
          html: buildMapHTML(latitude, longitude, label),
          baseUrl: 'https://localhost',
        }}
        onMessage={(e) => {
          const data = JSON.parse(e.nativeEvent.data);
          if (data.type === 'MAP_ERROR') console.error('[KakaoMap] 지도 에러:', data.message);
        }}
        onError={(e) => console.error('[KakaoMap] WebView 에러:', e.nativeEvent)}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        style={{ flex: 1, backgroundColor: 'transparent' }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
});
