import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, useWindowDimensions, Platform, RefreshControl,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { Card, Skeleton, Badge } from '@/components/ui';
import { Radius, Spacing, Typography, BOTTOM_TAB_H, WEB_TABLET_BP } from '@/styles/theme';

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const FILTERS = ['All', 'Top Gainers', 'Top Losers', 'DeFi'];

// Top coins configuration
const TOP_COINS = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', emoji: '₿', color: '#FFB23F' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', emoji: 'Ξ', color: '#5B8CFF' },
  { id: 'solana', symbol: 'SOL', name: 'Solana', emoji: '◎', color: '#9B7BFF' },
  { id: 'binancecoin', symbol: 'BNB', name: 'BNB', emoji: '◆', color: '#F3BA2F' },
  { id: 'ripple', symbol: 'XRP', name: 'XRP', emoji: '✕', color: '#00AAE4' },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano', emoji: '₳', color: '#0033AD' },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', emoji: '🐶', color: '#C3A634' },
  { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche', emoji: '🔺', color: '#E84142' },
  { id: 'polkadot', symbol: 'DOT', name: 'Polkadot', emoji: '●', color: '#E6007A' },
  { id: 'chainlink', symbol: 'LINK', name: 'Chainlink', emoji: '🔗', color: '#2A5ADA' },
  { id: 'matic-network', symbol: 'MATIC', name: 'Polygon', emoji: '⬡', color: '#8247E5' },
  { id: 'uniswap', symbol: 'UNI', name: 'Uniswap', emoji: '🦄', color: '#FF007A' },
  { id: 'litecoin', symbol: 'LTC', name: 'Litecoin', emoji: 'Ł', color: '#345D9D' },
  { id: 'near', symbol: 'NEAR', name: 'NEAR Protocol', emoji: 'Ⓝ', color: '#00C08B' },
  { id: 'aptos', symbol: 'APT', name: 'Aptos', emoji: '🔷', color: '#00B3FF' },
];

const DEFI_COINS = [
  'uniswap', 'aave', 'maker', 'curve-dao-token', 'compound-governance-token',
  'avalanche-2', 'matic-network', 'chainlink', 'pancakeswap-token', 'the-graph'
];

interface CoinMarketData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  price_change_percentage_24h: number;
  total_volume: number;
  circulating_supply: number;
  high_24h: number;
  low_24h: number;
}

export default function MarketsScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const showSidebar = isWeb && width >= WEB_TABLET_BP;
  const bottomPad = showSidebar ? 24 : BOTTOM_TAB_H + Math.max(insets.bottom, 8) + 16;

  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [coins, setCoins] = useState<CoinMarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'rank' | 'price' | 'change'>('rank');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  const flatListRef = useRef<FlatList>(null);

  const fetchCoins = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    
    try {
      const url = `${COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      setCoins(Array.isArray(data) ? data : []);
      setError(null);
      
      if (!isRefresh) {
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
        }, 100);
      }
    } catch (err) {
      console.error('Error fetching coins:', err);
      setError('Failed to load market data. Please try again.');
      setCoins([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCoins();
    
    const interval = setInterval(() => {
      fetchCoins(true);
    }, 60000);
    
    return () => clearInterval(interval);
  }, [fetchCoins]);

  const filteredCoins = useMemo(() => {
    if (!Array.isArray(coins) || coins.length === 0) {
      return [];
    }
    
    let filtered = [...coins];
    
    if (search.trim()) {
      const searchLower = search.toLowerCase().trim();
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(searchLower) ||
        c.symbol.toLowerCase().includes(searchLower)
      );
    }
    
    switch (filter) {
      case 'Top Gainers':
        filtered = filtered
          .filter(c => (c.price_change_percentage_24h || 0) > 0)
          .sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0))
          .slice(0, 20);
        return filtered;
        
      case 'Top Losers':
        filtered = filtered
          .filter(c => (c.price_change_percentage_24h || 0) < 0)
          .sort((a, b) => (a.price_change_percentage_24h || 0) - (b.price_change_percentage_24h || 0))
          .slice(0, 20);
        return filtered;
        
      case 'DeFi':
        filtered = filtered.filter(c => DEFI_COINS.includes(c.id));
        break;
        
      default:
        filtered = filtered.slice(0, 50);
    }
    
    if (filter === 'All' || filter === 'DeFi') {
      filtered.sort((a, b) => {
        let aVal: number, bVal: number;
        
        switch (sortBy) {
          case 'price':
            aVal = a.current_price || 0;
            bVal = b.current_price || 0;
            break;
          case 'change':
            aVal = a.price_change_percentage_24h || 0;
            bVal = b.price_change_percentage_24h || 0;
            break;
          default:
            aVal = a.market_cap_rank || 999;
            bVal = b.market_cap_rank || 999;
        }
        
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }
    
    return filtered;
  }, [coins, search, filter, sortBy, sortOrder]);

  const handleSort = (newSortBy: 'rank' | 'price' | 'change') => {
    if (filter === 'Top Gainers' || filter === 'Top Losers') return;
    
    if (sortBy === newSortBy) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
    
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, 100);
  };

  const formatMarketCap = (cap: number) => {
    if (!cap) return '$0';
    if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
    if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
    if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
    return `$${cap.toLocaleString()}`;
  };

  const formatPrice = (price: number) => {
    if (!price) return '$0.00';
    if (price < 0.00001) return `$${price.toFixed(8)}`;
    if (price < 0.001) return `$${price.toFixed(6)}`;
    if (price < 1) return `$${price.toFixed(4)}`;
    if (price >= 1000) {
      return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$${price.toFixed(2)}`;
  };

  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
        <View key={i} style={[styles.coinRow, { borderBottomColor: colors.border }]}>
          <View style={styles.cellRank}>
            <Skeleton width={20} height={14} />
          </View>
          <View style={styles.cellCoin}>
            <Skeleton width={36} height={36} style={{ borderRadius: 18 }} />
            <View style={{ marginLeft: 10 }}>
              <Skeleton width={60} height={14} />
              <Skeleton width={80} height={11} style={{ marginTop: 4 }} />
            </View>
          </View>
          <View style={styles.cellPrice}>
            <Skeleton width={80} height={14} />
            <Skeleton width={60} height={11} style={{ marginTop: 4 }} />
          </View>
          <View style={styles.cellChange}>
            <Skeleton width={65} height={26} style={{ borderRadius: 13 }} />
          </View>
        </View>
      ))}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="search-outline" size={64} color={colors.text3} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No coins found</Text>
      <Text style={[styles.emptyText, { color: colors.text2 }]}>
        {search ? `No results for "${search}"` : 'Try adjusting your filters'}
      </Text>
      {search && (
        <TouchableOpacity 
          style={[styles.resetBtn, { backgroundColor: colors.primary }]}
          onPress={() => setSearch('')}
          activeOpacity={0.8}
        >
          <Text style={styles.resetBtnText}>Clear Search</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="alert-circle-outline" size={64} color={colors.red} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>Oops!</Text>
      <Text style={[styles.emptyText, { color: colors.text2 }]}>{error}</Text>
      <TouchableOpacity 
        style={[styles.resetBtn, { backgroundColor: colors.primary }]}
        onPress={() => fetchCoins()}
        activeOpacity={0.8}
      >
        <Ionicons name="refresh-outline" size={18} color="#0C0716" style={{ marginRight: 6 }} />
        <Text style={styles.resetBtnText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCoinRow = ({ item: coin, index }: { item: CoinMarketData; index: number }) => {
    const change = coin.price_change_percentage_24h || 0;
    const coinInfo = TOP_COINS.find(c => c.id === coin.id);
    const emoji = coinInfo?.emoji || coin.symbol.charAt(0).toUpperCase();
    const iconColor = coinInfo?.color || colors.primary;
    const rank = coin.market_cap_rank || index + 1;
    
    return (
      <TouchableOpacity
        style={[styles.coinRow, { borderBottomColor: colors.border }]}
        activeOpacity={0.7}
        onPress={() => {
          console.log('Navigate to:', coin.id);
          // router.push(`/coin/${coin.id}`);
        }}
      >
        {/* Rank */}
        <View style={styles.cellRank}>
          <Text style={[styles.rankText, { color: colors.text3 }]}>
            {rank}
          </Text>
        </View>
        
        {/* Coin Info - FIXED ICON COLOR FOR DARK MODE */}
        <View style={styles.cellCoin}>
          <View style={[
            styles.coinIcon, 
            { 
              backgroundColor: iconColor + (isDark ? '25' : '18'),
              borderWidth: isDark ? 1 : 0,
              borderColor: iconColor + '40',
            }
          ]}>
            <Text style={[styles.coinEmoji, { color: iconColor }]}>
              {emoji}
            </Text>
          </View>
          <View style={styles.coinTextInfo}>
            <Text style={[styles.coinSymbol, { color: colors.text }]} numberOfLines={1}>
              {coin.symbol.toUpperCase()}
            </Text>
            <Text style={[styles.coinName, { color: colors.text2 }]} numberOfLines={1}>
              {coin.name}
            </Text>
          </View>
        </View>
        
        {/* Price */}
        <View style={styles.cellPrice}>
          <Text style={[styles.priceText, { color: colors.text }]} numberOfLines={1}>
            {formatPrice(coin.current_price)}
          </Text>
          <Text style={[styles.marketCapText, { color: colors.text3 }]} numberOfLines={1}>
            {formatMarketCap(coin.market_cap)}
          </Text>
        </View>
        
        {/* 24h Change */}
        <View style={styles.cellChange}>
          <Badge variant={change >= 0 ? 'green' : 'red'}>
            {change >= 0 ? '+' : ''}{change.toFixed(2)}%
          </Badge>
        </View>
      </TouchableOpacity>
    );
  };

  const ListHeaderComponent = () => (
    <>
      {/* Search */}
      <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={20} color={colors.text3} />
        <TextInput
          value={search} 
          onChangeText={setSearch}
          placeholder="Search coins..." 
          placeholderTextColor={colors.text3}
          style={[styles.searchInput, { color: colors.text }]}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close-circle" size={20} color={colors.text3} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.filtersScroll}
        contentContainerStyle={styles.filtersContent}
      >
        {FILTERS.map(f => {
          const isActive = filter === f;
          return (
            <TouchableOpacity
              key={f} 
              onPress={() => {
                setFilter(f);
                if (f === 'Top Gainers' || f === 'Top Losers') {
                  setSortBy('rank');
                  setSortOrder('asc');
                }
              }} 
              activeOpacity={0.7}
              style={[
                styles.filterBtn, 
                { 
                  backgroundColor: isActive ? colors.primary : colors.surface, 
                  borderColor: isActive ? colors.primary : colors.border 
                }
              ]}
            >
              <Text style={[styles.filterText, { color: isActive ? '#fff' : colors.text2 }]}>
                {f}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Table Header */}
      <View style={[styles.tableHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.cellRank}>
          <Text style={[styles.headerText, { color: colors.text2 }]}>#</Text>
        </View>
        
        <View style={styles.cellCoin}>
          <Text style={[styles.headerText, { color: colors.text2 }]}>Coin</Text>
        </View>
        
        <TouchableOpacity 
          style={[styles.cellPrice, styles.headerTouchable]} 
          onPress={() => handleSort('price')}
          activeOpacity={0.7}
          disabled={filter === 'Top Gainers' || filter === 'Top Losers'}
        >
          <Text style={[styles.headerText, { color: colors.text2 }]}>Price</Text>
          {sortBy === 'price' && (filter === 'All' || filter === 'DeFi') && (
            <Ionicons 
              name={sortOrder === 'asc' ? 'chevron-up' : 'chevron-down'} 
              size={12} 
              color={colors.primary}
              style={{ marginLeft: 2 }}
            />
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.cellChange, styles.headerTouchable]} 
          onPress={() => handleSort('change')}
          activeOpacity={0.7}
          disabled={filter === 'Top Gainers' || filter === 'Top Losers'}
        >
          <Text style={[styles.headerText, { color: colors.text2 }]}>24h</Text>
          {sortBy === 'change' && (filter === 'All' || filter === 'DeFi') && (
            <Ionicons 
              name={sortOrder === 'asc' ? 'chevron-up' : 'chevron-down'} 
              size={12} 
              color={colors.primary}
              style={{ marginLeft: 2 }}
            />
          )}
        </TouchableOpacity>
      </View>
    </>
  );

  const ListFooterComponent = () => {
    if (loading || filteredCoins.length === 0) return null;
    
    return (
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.text3 }]}>
          Showing {filteredCoins.length} coin{filteredCoins.length !== 1 ? 's' : ''}
        </Text>
        <Text style={[styles.footerText, { color: colors.text3 }]}>
          Updated {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.surface }]}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        
        <Text style={[styles.headerTitle, { color: colors.text }]}>Markets</Text>
        
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: colors.surface, opacity: refreshing ? 0.5 : 1 }]}
          onPress={() => fetchCoins(true)}
          disabled={refreshing}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh-outline" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading && !refreshing ? (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.listHeader}>
            <ListHeaderComponent />
          </View>
          <Card noPad>
            {renderSkeleton()}
          </Card>
        </ScrollView>
      ) : error && coins.length === 0 ? (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
          showsVerticalScrollIndicator={false}
        >
          {renderErrorState()}
        </ScrollView>
      ) : (
        <FlatList
          ref={flatListRef}
          data={filteredCoins}
          keyExtractor={(item) => item.id}
          renderItem={renderCoinRow}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <ListHeaderComponent />
              <Card noPad style={{ marginTop: 0 }}>
                <View />
              </Card>
            </View>
          }
          ListFooterComponent={
            <View>
              <Card noPad>
                <View />
              </Card>
              <ListFooterComponent />
            </View>
          }
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={[styles.flatListContent, { paddingBottom: bottomPad }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchCoins(true)}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          initialNumToRender={20}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={Platform.OS === 'android'}
          onEndReachedThreshold={0.5}
          keyboardShouldPersistTaps="handled"
          getItemLayout={(data, index) => ({
            length: 68,
            offset: 68 * index,
            index,
          })}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: Typography.xl,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  
  flatListContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  
  listHeader: {
    marginBottom: 12,
  },
  
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.base,
    padding: 0,
  },
  
  filtersScroll: {
    marginBottom: 16,
    marginHorizontal: -16,
  },
  filtersContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  filterText: {
    fontSize: Typography.sm,
    fontWeight: '600',
  },
  
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
  },
  headerTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  
  coinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    minHeight: 68,
  },
  
  cellRank: {
    width: 32,
    justifyContent: 'center',
  },
  cellCoin: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    paddingRight: 4,
  },
  cellPrice: {
    width: 95,
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  cellChange: {
    width: 75,
    alignItems: 'flex-end',
  },
  
  // FIXED ICON STYLES FOR DARK MODE
  coinIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  coinEmoji: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  coinTextInfo: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  coinSymbol: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  coinName: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  
  rankText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '700',
  },
  marketCapText: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: Typography.xl,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: Typography.sm,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '500',
  },
  
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: Radius.full,
    marginTop: 16,
  },
  resetBtnText: {
    color: '#0C0716',
    fontSize: 14,
    fontWeight: '700',
  },
  
  skeletonContainer: {
    gap: 0,
  },
});