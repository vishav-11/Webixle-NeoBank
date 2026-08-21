// // app/(screens)/Buy/MoonPayWebView.tsx
// import React, { useRef, useState, useCallback } from "react";
// import {
//   View,
//   StyleSheet,
//   ActivityIndicator,
//   TouchableOpacity,
//   Text,
//   Alert,
//   Platform,
// } from "react-native";
// import { WebView, WebViewNavigation } from "react-native-webview";
// import { useRouter, useLocalSearchParams } from "expo-router";
// import { useSafeAreaInsets } from "react-native-safe-area-context";
// import { Ionicons } from "@expo/vector-icons";
// import { useTheme } from "@/context/ThemeContext";
// import { Typography, Spacing, Radius } from "@/styles/theme";

// // Return URL jo MoonPay use karega
// export const MOONPAY_RETURN_URL = "https://app.yourmetavault.com/conversion/success";
// export const MOONPAY_RETURN_URL_CANCEL = "https://app.yourmetavault.com/conversion/cancelled";

// export default function MoonPayWebViewScreen() {
//   const { colors } = useTheme();
//   const router = useRouter();
//   const insets = useSafeAreaInsets();
//   const webViewRef = useRef<WebView>(null);

//   // BuyMain se URL params receive karo
//   const { url, mode } = useLocalSearchParams<{
//     url: string;
//     mode: "buy" | "sell";
//   }>();

//   const [loading, setLoading] = useState(true);
//   const [canGoBack, setCanGoBack] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   // ── Navigation Change Handler ─────────────────────────────────────────────
//   const handleNavigationChange = useCallback(
//     (navState: WebViewNavigation) => {
//       setCanGoBack(navState.canGoBack);

//       const currentUrl = navState.url;
//       console.log("[MoonPay WebView] URL:", currentUrl);

//       // ✅ Success URL detect karo
//       if (currentUrl.includes("yourmetavault.com/conversion/success")) {
//         // URL se params extract karo
//         const urlObj = new URL(currentUrl);
//         const transactionId = urlObj.searchParams.get("transactionId") ?? "";
//         const status = urlObj.searchParams.get("transactionStatus") ?? "";
//         const baseCurrencyCode = urlObj.searchParams.get("baseCurrencyCode") ?? "";
//         const baseCurrencyAmount = urlObj.searchParams.get("baseCurrencyAmount") ?? "";

//         // Result screen pe navigate karo
//         router.replace({
//           pathname: "/(screens)/Buy/TransactionResult",
//           params: {
//             transactionId,
//             status,
//             baseCurrencyCode,
//             baseCurrencyAmount,
//             mode,
//           },
//         });
//         return;
//       }

//       // ❌ Cancel URL detect karo
//       if (currentUrl.includes("yourmetavault.com/conversion/cancelled")) {
//         router.replace({
//           pathname: "/(screens)/Buy/TransactionResult",
//           params: {
//             status: "cancelled",
//             mode,
//           },
//         });
//         return;
//       }
//     },
//     [router, mode]
//   );

//   // ── Back Button ───────────────────────────────────────────────────────────
//   const handleBack = useCallback(() => {
//     if (canGoBack && webViewRef.current) {
//       webViewRef.current.goBack();
//     } else {
//       Alert.alert(
//         "Cancel Transaction",
//         "Are you sure you want to cancel?",
//         [
//           { text: "Continue", style: "cancel" },
//           {
//             text: "Cancel",
//             style: "destructive",
//             onPress: () => router.back(),
//           },
//         ]
//       );
//     }
//   }, [canGoBack, router]);

//   if (!url) {
//     return (
//       <View style={[s.root, { backgroundColor: colors.bg }]}>
//         <Text style={{ color: colors.text }}>No URL provided</Text>
//       </View>
//     );
//   }

//   return (
//     <View style={[s.root, { backgroundColor: colors.bg }]}>
//       {/* ── Header ── */}
//       <View
//         style={[
//           s.header,
//           {
//             paddingTop: insets.top + 8,
//             backgroundColor: colors.card,
//             borderBottomColor: colors.border,
//           },
//         ]}
//       >
//         <TouchableOpacity
//           style={[s.iconBtn, { backgroundColor: colors.surface }]}
//           onPress={handleBack}
//           activeOpacity={0.8}
//         >
//           <Ionicons name="arrow-back" size={18} color={colors.text} />
//         </TouchableOpacity>

//         <View style={s.headerCenter}>
//           <Ionicons name="shield-checkmark" size={16} color="#7B68EE" />
//           <Text style={[s.headerTitle, { color: colors.text }]}>
//             MoonPay · {mode === "buy" ? "Buy" : "Sell"}
//           </Text>
//         </View>

//         <View style={[s.secureTag, { backgroundColor: "#7B68EE20" }]}>
//           <Ionicons name="lock-closed" size={10} color="#7B68EE" />
//           <Text style={[s.secureTxt, { color: "#7B68EE" }]}>Secure</Text>
//         </View>
//       </View>

//       {/* ── Loading Bar ── */}
//       {loading && (
//         <View style={[s.loadingBar, { backgroundColor: colors.surface }]}>
//           <ActivityIndicator color={colors.green} size="small" />
//           <Text style={[s.loadingTxt, { color: colors.text2 }]}>
//             Loading MoonPay...
//           </Text>
//         </View>
//       )}

//       {/* ── Error State ── */}
//       {error && (
//         <View style={[s.errorBox, { backgroundColor: `${colors.red}15` }]}>
//           <Ionicons name="alert-circle" size={20} color={colors.red} />
//           <Text style={[s.errorTxt, { color: colors.red }]}>{error}</Text>
//           <TouchableOpacity
//             onPress={() => {
//               setError(null);
//               webViewRef.current?.reload();
//             }}
//           >
//             <Text style={[s.retryTxt, { color: colors.green }]}>Retry</Text>
//           </TouchableOpacity>
//         </View>
//       )}

//       {/* ── WebView ── */}
//       <WebView
//         ref={webViewRef}
//         source={{ uri: decodeURIComponent(url as string) }}
//         style={s.webview}
//         onLoadStart={() => setLoading(true)}
//         onLoadEnd={() => setLoading(false)}
//         onNavigationStateChange={handleNavigationChange}
//         onError={(e : any) => {
//           setLoading(false);
//           setError("Failed to load MoonPay. Please check your connection.");
//           console.error("[MoonPay WebView Error]", e.nativeEvent);
//         }}
//         // ✅ Important settings
//         javaScriptEnabled
//         domStorageEnabled
//         thirdPartyCookiesEnabled
//         sharedCookiesEnabled
//         allowsBackForwardNavigationGestures
//         // MoonPay ke liye user agent
//         userAgent={
//           Platform.OS === "ios"
//             ? "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15"
//             : "Mozilla/5.0 (Linux; Android 12; Mobile) AppleWebKit/537.36"
//         }
//         // Popup/new tab handle karo
//         onShouldStartLoadWithRequest={(request:any) => {
//           // MoonPay domains allow karo
//           const allowedDomains = [
//             "moonpay.com",
//             "yourmetavault.com",
//             "buy.moonpay.com",
//             "sell.moonpay.com",
//           ];
//           const isAllowed = allowedDomains.some((d) =>
//             request.url.includes(d)
//           );
//           console.log(
//             "[WebView] Load request:",
//             request.url,
//             "Allowed:",
//             isAllowed
//           );
//           return isAllowed || request.url.startsWith("https://");
//         }}
//       />
//     </View>
//   );
// }

// const s = StyleSheet.create({
//   root: { flex: 1 },
//   header: {
//     flexDirection: "row",
//     alignItems: "center",
//     paddingHorizontal: Spacing[4],
//     paddingBottom: 10,
//     borderBottomWidth: 1,
//     gap: 10,
//   },
//   headerCenter: {
//     flex: 1,
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "center",
//     gap: 6,
//   },
//   headerTitle: {
//     fontSize: Typography.base,
//     fontWeight: "700",
//   },
//   iconBtn: {
//     width: 38,
//     height: 38,
//     borderRadius: Radius.lg,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   secureTag: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 3,
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: Radius.full,
//   },
//   secureTxt: { fontSize: 10, fontWeight: "700" },
//   loadingBar: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 8,
//     padding: 10,
//     justifyContent: "center",
//   },
//   loadingTxt: { fontSize: Typography.xs },
//   errorBox: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 8,
//     padding: 12,
//     margin: 12,
//     borderRadius: Radius.xl,
//   },
//   errorTxt: { flex: 1, fontSize: Typography.xs },
//   retryTxt: { fontSize: Typography.sm, fontWeight: "700" },
//   webview: { flex: 1 },
// });