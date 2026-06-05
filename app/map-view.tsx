import {
  View, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/common/AppText';
import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';

const JS_KEY = process.env.EXPO_PUBLIC_KAKAO_JS_KEY ?? '';

function buildFullMapHTML(lat: number, lng: number, label: string) {
  const safeLabel = label.replace(/'/g, "\\'").replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    html,body,#map{width:100%;height:100%;margin:0;padding:0;overflow:hidden;}
  </style>
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
            map.setDraggable(true);
            map.setZoomable(true);
            map.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT);
            map.addControl(new kakao.maps.MapTypeControl(), kakao.maps.ControlPosition.TOPRIGHT);

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
      script.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=${JS_KEY}&autoload=false&libraries=services';
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

export default function MapViewPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ lat?: string; lng?: string; label?: string; address?: string }>();

  const lat = parseFloat(params.lat ?? '');
  const lng = parseFloat(params.lng ?? '');
  const label = params.label ?? params.address ?? '';
  const [loading, setLoading] = useState(true);

  const isValid = !Number.isNaN(lat) && !Number.isNaN(lng);

  return (
    <View style={s.container}>
      {/* 헤더 (지도 위에 떠있는 형태) */}
      <View style={[s.header, { paddingTop: insets.top - 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <View style={s.headerTextWrap}>
          <Text style={s.headerTitle} numberOfLines={1}>위치 보기</Text>
          {label ? <Text style={s.headerSub} numberOfLines={1}>{label}</Text> : null}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* 지도 */}
      {isValid ? (
        <WebView
          source={{
            html: buildFullMapHTML(lat, lng, label),
            baseUrl: 'https://localhost',
          }}
          onMessage={(e) => {
            const data = JSON.parse(e.nativeEvent.data);
            if (data.type === 'MAP_ERROR') console.error('[MapView] 지도 에러:', data.message);
          }}
          onError={(e) => console.error('[MapView] WebView 에러:', e.nativeEvent)}
          onLoadEnd={() => setLoading(false)}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
          style={{ flex: 1 }}
        />
      ) : (
        <View style={s.center}>
          <Text style={s.errText}>위치 정보가 없습니다.</Text>
        </View>
      )}

      {loading && isValid && (
        <View style={s.loading} pointerEvents="none">
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      )}

      <View style={{ height: insets.bottom, backgroundColor: '#fff' }} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTextWrap: { flex: 1, marginLeft: 4 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  headerSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errText: { fontSize: 14, color: '#9ca3af' },
  loading: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
});
