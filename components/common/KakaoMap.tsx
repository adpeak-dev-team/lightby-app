import { View, StyleSheet } from 'react-native';
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
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_OK' }));
          } catch(e) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_ERROR', message: e.message }));
          }
        });
      }

      var script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=${JS_KEY}&autoload=false';
      script.onload = initMap;
      script.onerror = function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_ERROR', message: 'SDK load failed' }));
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
  return (
    <View style={[s.wrap, { height }]}>
      <WebView
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
        style={{ flex: 1 }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
});
