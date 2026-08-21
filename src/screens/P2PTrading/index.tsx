import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  Platform, Animated, ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { Spacing, Typography, Radius, IconSize } from "@/styles/theme";
import { useAuth } from "@/context/AuthContext";

import {
  useP2PAds, useMyP2POrders, useMyP2PAds, useMyTradeRequests,
  useCancelP2POrder, useReleaseP2POrder, useMarkFiatSent,
  useRaiseP2PDispute, useRateP2PSeller, useDeleteP2PAd,
} from "@/hooks/queires";

import { useKycGuard } from "@/hooks/useKycGuard";
import { KycRequiredModal } from "@/components/common/KycRequiredModal";
import { warmAllChains } from "@/cache/assetCache";
import { showAlert } from "./constants";

import MarketTab      from "./components/MarketTab";
import OrdersTab      from "./components/OrdersTab";
import RequestedTab   from "./components/RequestedTab";
import MyAdsTab       from "./components/MyAdsTab";
import CreateAdModal  from "./components/CreateAdModal";
import PlaceOrderModal  from "./components/PlaceOrderModal";
import OrderDetailModal from "./components/OrderDetailModal";
import {
  CancelOrderModal, ReleaseOrderModal, FiatSentModal,
  DisputeModal, RateSellerModal, DeleteAdModal,
} from "./components/ActionModals";

import type { P2PAd, P2POrder, P2PAdType } from "@/types/p2pTypes";

if (Platform.OS === "web" && typeof document !== "undefined") {
  const st = document.createElement("style");
  st.innerHTML = `input,textarea{outline:none!important;box-shadow:none!important;-webkit-appearance:none!important;}`;
  document.head.appendChild(st);
}

type TabType        = "market" | "orders" | "requested" | "myads";
type ActionModalType = "cancel" | "release" | "fiatSent" | "dispute" | "rate" | "deleteAd" | null;

const ADS_PER_PAGE = 10;

const TABS = [
  { key: "market",    label: "Market",    icon: "storefront-outline" },
  { key: "orders",    label: "Orders",    icon: "receipt-outline"    },
  { key: "requested", label: "Requested", icon: "hourglass-outline"  },
  { key: "myads",     label: "My Ads",    icon: "megaphone-outline"  },
] as const;

export default function P2PScreen() {
  const { colors, isDark } = useTheme();
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { user } = useAuth();

  const { isKycApproved } = useKycGuard();
  const [kycModalVisible, setKycModalVisible] = useState(!isKycApproved);
  const [tab, setTab] = useState<TabType>("market");

  const [filterAsset, setFilterAsset] = useState("");
  const [filterType,  setFilterType]  = useState<P2PAdType | "">("");
  const [filterCurr,  setFilterCurr]  = useState("");
  const [filterAmt,   setFilterAmt]   = useState("");
  const [adsPage,     setAdsPage]     = useState(1);

  const [showCreateAd, setShowCreateAd] = useState(false);
  const [selAd,        setSelAd]        = useState<P2PAd | null>(null);
  const [selOrder,     setSelOrder]     = useState<P2POrder | null>(null);
  const [adToDelete,   setAdToDelete]   = useState<P2PAd | null>(null);
  const [actionModal,  setActionModal]  = useState<ActionModalType>(null);
  
  // ✅ FIX: Use useRef for animation value and loop control
  const spinValue = useRef(new Animated.Value(0)).current;
  const spinAnimation = useRef<Animated.CompositeAnimation | null>(null);

  const adsParams = {
    page: adsPage, 
    limit: ADS_PER_PAGE,
    ...(filterAsset && { asset: filterAsset }),
    ...(filterType  && { type: filterType  }),
    ...(filterCurr  && { currency: filterCurr }),
  };

  const { data: adsData,      isLoading: adsLoading,      isFetching: adsRefreshing,      refetch: refetchAds      } = useP2PAds(adsParams);
  const { data: ordersData,   isLoading: ordersLoading,   isFetching: ordersRefreshing,   refetch: refetchOrders   } = useMyP2POrders();
  const { data: requestsData, isLoading: requestsLoading, isFetching: requestsRefreshing, refetch: refetchRequests } = useMyTradeRequests();
  const { data: myAdsData,    isLoading: myAdsLoading,    isFetching: myAdsRefreshing,    refetch: refetchMyAds    } = useMyP2PAds();

  const adsResult = adsData ?? { 
    page: 1, 
    limit: ADS_PER_PAGE, 
    totalPage: 1, 
    totalData: 0, 
    total: 0, 
    ads: [] as P2PAd[] 
  };

  // ✅ FIX: Memoize filtered ads to avoid recalculation on every render
  const filteredAdsResult = React.useMemo(() => {
    if (!user?._id) return adsResult;
    
    const others = adsResult.ads.filter(a => a.userId?._id !== user._id);
    const removedCount = adsResult.ads.length - others.length;
    
    return {
      ...adsResult,
      ads: others,
      total: Math.max(0, adsResult.total - removedCount),
      totalData: Math.max(0, (adsResult.totalData || 0) - removedCount),
      totalPage: Math.ceil(Math.max(0, (adsResult.totalData || 0) - removedCount) / ADS_PER_PAGE),
    };
  }, [adsResult, user?._id]);

  const orders: P2POrder[] = ordersData ?? [];
  const requests = requestsData ?? [];

  // ✅ FIX: Simplify myAdsResult logic
  const myAdsResult = React.useMemo(() => {
    const defaultResult = { 
      page: 1, 
      limit: 10, 
      totalPage: 1, 
      totalData: 0, 
      total: 0, 
      ads: [] as P2PAd[] 
    };

    if (!myAdsData) return defaultResult;
    
    if (Array.isArray(myAdsData)) {
      return { 
        ...defaultResult,
        totalData: myAdsData.length, 
        total: myAdsData.length, 
        ads: myAdsData 
      };
    }
    
    return myAdsData;
  }, [myAdsData]);

  const cancelOrderM  = useCancelP2POrder();
  const releaseOrderM = useReleaseP2POrder();
  const markFiatSentM = useMarkFiatSent();
  const disputeM      = useRaiseP2PDispute();
  const rateSellerM   = useRateP2PSeller();
  const deleteAdM     = useDeleteP2PAd();

  // ✅ Initial warm-up
  useEffect(() => { 
    warmAllChains(); 
  }, []);

  // ✅ FIX: Sync KYC modal with approval status
  useEffect(() => { 
    if (isKycApproved) {
      setKycModalVisible(false);
    }
  }, [isKycApproved]);

  // ✅ FIX: Properly control spin animation with start/stop
  useEffect(() => {
    const isRefreshing =
      (tab === "market"    && adsRefreshing)     ||
      (tab === "orders"    && ordersRefreshing)   ||
      (tab === "requested" && requestsRefreshing) ||
      (tab === "myads"     && myAdsRefreshing);

    if (isRefreshing) {
      // Start animation
      spinAnimation.current = Animated.loop(
        Animated.timing(spinValue, { 
          toValue: 1, 
          duration: 1000, 
          useNativeDriver: true 
        })
      );
      spinAnimation.current.start();
    } else {
      // Stop animation
      if (spinAnimation.current) {
        spinAnimation.current.stop();
        spinAnimation.current = null;
      }
      spinValue.setValue(0);
    }

    // Cleanup on unmount
    return () => {
      if (spinAnimation.current) {
        spinAnimation.current.stop();
        spinAnimation.current = null;
      }
    };
  }, [adsRefreshing, ordersRefreshing, requestsRefreshing, myAdsRefreshing, tab]);

  const spin = spinValue.interpolate({ 
    inputRange: [0, 1], 
    outputRange: ["0deg", "360deg"] 
  });

  // ✅ Handlers
  const handleApplyFilters = () => { 
    setAdsPage(1); 
    refetchAds(); 
  };

  const handleLoadPage = (pg: number) => {
    setAdsPage(pg);
  };

  const handleRefreshAds = () => { 
    setAdsPage(1); 
    refetchAds(); 
  };

  const handleSetFilterType = (val: string) => {
    setFilterType(val as P2PAdType | "");
  };

  const closeActionModal = () => {
    setActionModal(null);
  };

  const handleTabChange = (newTab: TabType) => {
    setTab(newTab);
    
    // Trigger refresh for the new tab
    switch (newTab) {
      case "market":    refetchAds();      break;
      case "orders":    refetchOrders();   break;
      case "requested": refetchRequests(); break;
      case "myads":     refetchMyAds();    break;
    }
  };

  const handleRefreshCurrentTab = () => {
    switch (tab) {
      case "market":    handleRefreshAds(); break;
      case "orders":    refetchOrders();    break;
      case "requested": refetchRequests();  break;
      case "myads":     refetchMyAds();     break;
    }
  };

  // ✅ FIX: Improve error handling in mutations
  const confirmCancel = (reason: string) => {
    if (!selOrder) return;
    
    cancelOrderM.mutate(
      { id: selOrder._id, reason: reason || undefined },
      {
        onSuccess: () => { 
          refetchOrders(); 
          closeActionModal(); 
          setSelOrder(null);
          showAlert("Success", "Order cancelled successfully");
        },
        onError: (e: any) => {
          const errorMsg = e?.response?.data?.message || e?.message || "Cancel failed";
          showAlert("Error", errorMsg);
        },
      }
    );
  };

  const confirmRelease = () => {
    if (!selOrder) return;
    
    releaseOrderM.mutate(selOrder._id, {
      onSuccess: () => { 
        refetchOrders(); 
        closeActionModal(); 
        setSelOrder(null);
        showAlert("Success", "Order released successfully");
      },
      onError: (e: any) => {
        const errorMsg = e?.response?.data?.message || e?.message || "Release failed";
        showAlert("Error", errorMsg);
      },
    });
  };

  const confirmFiatSent = (proof: string) => {
    if (!selOrder) return;
    
    markFiatSentM.mutate(
      { id: selOrder._id, proof: proof || undefined },
      {
        onSuccess: () => { 
          refetchOrders(); 
          closeActionModal();
          showAlert("Success", "Payment confirmation sent");
        },
        onError: (e: any) => {
          const errorMsg = e?.response?.data?.message || e?.message || "Failed to confirm payment";
          showAlert("Error", errorMsg);
        },
      }
    );
  };

  const confirmDispute = (reason: string) => {
    if (!selOrder) return;
    
    disputeM.mutate(
      { orderId: selOrder._id, body: { reason } },
      {
        onSuccess: () => { 
          refetchOrders(); 
          closeActionModal();
          showAlert("Success", "Dispute raised successfully");
        },
        onError: (e: any) => {
          const errorMsg = e?.response?.data?.message || e?.message || "Failed to raise dispute";
          showAlert("Error", errorMsg);
        },
      }
    );
  };

  const confirmRate = (rating: number, comment: string) => {
    if (!selOrder) return;
    
    rateSellerM.mutate(
      { orderId: selOrder._id, body: { rating, comment: comment || undefined } },
      {
        onSuccess: () => { 
          closeActionModal(); 
          setSelOrder(null); 
          showAlert("Thanks!", "Your rating has been submitted.");
        },
        onError: (e: any) => {
          const errorMsg = e?.response?.data?.message || e?.message || "Failed to submit rating";
          showAlert("Error", errorMsg);
        },
      }
    );
  };

  const confirmDeleteAd = () => {
    if (!adToDelete) return;
    
    deleteAdM.mutate(adToDelete._id, {
      onSuccess: () => { 
        refetchMyAds(); 
        closeActionModal(); 
        setAdToDelete(null);
        showAlert("Success", "Ad deleted successfully");
      },
      onError: (e: any) => {
        const errorMsg = e?.response?.data?.message || e?.message || "Delete failed";
        showAlert("Error", errorMsg);
      },
    });
  };

  // ── KYC Guard ──────────────────────────────────────────────────────────────
  if (!isKycApproved) {
    return (
      <View style={[s.root, { backgroundColor: colors.bg }]}>
        <View style={[s.header, { paddingTop: insets.top + 10, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={[s.iconBtn, { backgroundColor: colors.surface }]}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={IconSize.sm} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.text }]}>P2P Trading</Text>
          <View style={{ width: 38 }} />
        </View>
        <KycRequiredModal
          visible={kycModalVisible}
          onClose={() => { 
            setKycModalVisible(false); 
            router.back(); 
          }}
          onGoKyc={() => { 
            setKycModalVisible(false); 
            router.push("/(app)/kyc"); 
          }}
          // removed colors/isDark props — not part of KycRequiredModal Props
        />
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 10, borderBottomColor: colors.bg }]}>
        <TouchableOpacity
          style={[s.iconBtn, { backgroundColor: colors.surface }]}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={IconSize.sm} color={colors.text} />
        </TouchableOpacity>

        <Text style={[s.headerTitle, { color: colors.text }]}>P2P Trading</Text>

        <View style={s.headerRightBtns}>
          {/* Refresh */}
          <TouchableOpacity
            style={[s.iconBtn, { backgroundColor: colors.surface }]}
            onPress={handleRefreshCurrentTab}
            activeOpacity={0.8}
          >
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Ionicons name="refresh" size={IconSize.sm} color={colors.text} />
            </Animated.View>
          </TouchableOpacity>

          {/* Create Ad */}
          <TouchableOpacity
            style={[s.iconBtn, { backgroundColor: colors.primaryDim }]}
            onPress={() => setShowCreateAd(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={IconSize.lg} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Bar */}
      <View style={[s.tabBarContainer, { borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.tabBar}
        >
          {TABS.map(t => {
            const active = tab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[
                  s.tabBtn,
                  active
                    ? { backgroundColor: colors.primaryDim, borderColor: colors.primary }
                    : { borderColor: colors.border },
                ]}
                onPress={() => handleTabChange(t.key)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={t.icon}
                  size={IconSize.xs}
                  color={active ? colors.primary : colors.text3}
                />
                <Text style={[s.tabTxt, { color: active ? colors.primary : colors.text2 }]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Tab Content */}
      {tab === "market" && (
        <MarketTab
          adsResult={filteredAdsResult}
          adsLoading={adsLoading}
          refreshing={adsRefreshing}
          ADS_PER_PAGE={ADS_PER_PAGE}
          filterAsset={filterAsset}
          filterType={filterType}
          filterCurr={filterCurr}
          filterAmt={filterAmt}
          setFilterAsset={setFilterAsset}
          setFilterType={handleSetFilterType}
          setFilterCurr={setFilterCurr}
          setFilterAmt={setFilterAmt}
          onApply={handleApplyFilters}
          onLoadPage={handleLoadPage}
          onRefresh={handleRefreshAds}
          onSelectAd={setSelAd}
          colors={colors}
        />
      )}

      {tab === "orders" && (
        <OrdersTab
          orders={orders}
          ordersLoading={ordersLoading}
          onRefresh={refetchOrders}
          onSelectOrder={setSelOrder}
          colors={colors}
        />
      )}

      {tab === "requested" && (
        <RequestedTab
          requests={requests}
          requestsLoading={requestsLoading}
          onRefresh={refetchRequests}
          colors={colors}
        />
      )}

      {tab === "myads" && (
        <MyAdsTab
          myAdsResult={myAdsResult}
          myAdsLoading={myAdsLoading}
          onRefresh={refetchMyAds}
          onCreateAd={() => setShowCreateAd(true)}
          onDeleteAd={ad => {
            setAdToDelete(ad);
            setActionModal("deleteAd");
          }}
          colors={colors}
        />
      )}

      {/* Modals */}
      <CreateAdModal
        visible={showCreateAd}
        onClose={() => setShowCreateAd(false)}
        onSuccess={() => {
          setShowCreateAd(false);
          if (tab === "myads") refetchMyAds();
          else refetchAds();
        }}
        colors={colors}
        isDark={isDark}
      />

      <PlaceOrderModal
        visible={!!selAd}
        ad={selAd}
        onClose={() => setSelAd(null)}
        onSuccess={() => {
          refetchAds();
          if (tab === "orders") refetchOrders();
          refetchRequests();
        }}
        colors={colors}
      />

      <OrderDetailModal
        visible={!!selOrder}
        hidden={actionModal !== null}
        order={selOrder}
        onClose={() => setSelOrder(null)}
        onMarkFiatSent={() => setActionModal("fiatSent")}
        onCancel={() => setActionModal("cancel")}
        onRelease={() => setActionModal("release")}
        onDispute={() => setActionModal("dispute")}
        onRateSeller={() => setActionModal("rate")}
        colors={colors}
      />

      <CancelOrderModal
        visible={actionModal === "cancel"}
        loading={cancelOrderM.isPending}
        onClose={closeActionModal}
        onConfirm={confirmCancel}
        colors={colors}
      />

      <ReleaseOrderModal
        visible={actionModal === "release"}
        order={selOrder}
        loading={releaseOrderM.isPending}
        onClose={closeActionModal}
        onConfirm={confirmRelease}
        colors={colors}
      />

      <FiatSentModal
        visible={actionModal === "fiatSent"}
        order={selOrder}
        loading={markFiatSentM.isPending}
        onClose={closeActionModal}
        onConfirm={confirmFiatSent}
        colors={colors}
      />

      <DisputeModal
        visible={actionModal === "dispute"}
        loading={disputeM.isPending}
        onClose={closeActionModal}
        onConfirm={confirmDispute}
        colors={colors}
      />

      <RateSellerModal
        visible={actionModal === "rate"}
        loading={rateSellerM.isPending}
        onClose={closeActionModal}
        onConfirm={confirmRate}
        colors={colors}
      />

      <DeleteAdModal
        visible={actionModal === "deleteAd"}
        ad={adToDelete}
        loading={deleteAdM.isPending}
        onClose={() => {
          closeActionModal();
          setAdToDelete(null);
        }}
        onConfirm={confirmDeleteAd}
        colors={colors}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[3],
    borderBottomWidth: 1,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: Typography.lg,
    fontWeight: "700",
  },
  headerRightBtns: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[2],
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBarContainer: { borderBottomWidth: 1 },
  tabBar: {
    flexDirection: "row",
    gap: Spacing[2] + 2,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
  },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[1] + 2,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2] + 1,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  tabTxt: { fontSize: Typography.sm, fontWeight: "600" },
});