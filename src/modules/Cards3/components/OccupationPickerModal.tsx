// CardModule/components/OccupationPickerModal.tsx

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, ActivityIndicator, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, Typography, Radius } from '@/styles/theme';
import { useOccupationSearch } from '../hooks';

// ── Debounce hook ──────────────────────────────────────────────
function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ────────────────────────────────────────────────────────────────

interface Occupation {
  code: string;
  title: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (occ: Occupation) => void;
  selectedCode?: string;
}

export default function OccupationPickerModal({
  visible,
  onClose,
  onSelect,
  selectedCode,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [allDocs, setAllDocs] = useState<Occupation[]>([]);

  // ✅ Debounce + sanitize search
  const debouncedSearch = useDebounce(search, 400);
  
  // ✅ Memoize normalized search to prevent unnecessary re-renders
  const normalizedSearch = React.useMemo(() => {
    const s = (debouncedSearch ?? '').trim();
    if (!s || s === 'undefined' || s === 'null') return '';
    return s.toLowerCase();
  }, [debouncedSearch]);

  // ✅ Track loaded pages per search query
  const loadedPagesRef = useRef<Map<string, Set<number>>>(new Map());
  
  const { data, isFetching, isLoading, error } = useOccupationSearch(
    normalizedSearch,
    page,
    visible, // ✅ Only fetch when modal is visible
  );

  // ✅ Log for debugging
  useEffect(() => {
    if (data) {
      console.log(`[OccupationModal] Data received:`, {
        search: normalizedSearch,
        page: data.page,
        docsCount: data.docs.length,
        totalPages: data.totalPages,
      });
    }
  }, [data, normalizedSearch]);

  useEffect(() => {
    if (error) {
      console.error('[OccupationModal] Error:', error);
    }
  }, [error]);

  // ✅ Reset on search change
  useEffect(() => {
    console.log('[OccupationModal] Search changed to:', normalizedSearch);
    setPage(1);
    setAllDocs([]);
    // Clear loaded pages for this search
    if (!loadedPagesRef.current.has(normalizedSearch)) {
      loadedPagesRef.current.set(normalizedSearch, new Set());
    }
  }, [normalizedSearch]);

  // ✅ Reset on modal close
  useEffect(() => {
    if (!visible) {
      console.log('[OccupationModal] Modal closed, full reset');
      setSearch('');
      setPage(1);
      setAllDocs([]);
      loadedPagesRef.current.clear();
    }
  }, [visible]);

  // ✅ Accumulate data when new page loads
  useEffect(() => {
    if (!data?.docs?.length) return;

    // Get loaded pages for current search
    if (!loadedPagesRef.current.has(normalizedSearch)) {
      loadedPagesRef.current.set(normalizedSearch, new Set());
    }
    const loadedPages = loadedPagesRef.current.get(normalizedSearch)!;

    // Already loaded this page?
    if (loadedPages.has(data.page)) {
      console.log('[OccupationModal] Page already loaded, skipping:', data.page);
      return;
    }

    // Mark as loaded
    loadedPages.add(data.page);

    console.log('[OccupationModal] Processing new data:', {
      search: normalizedSearch,
      page: data.page,
      docsCount: data.docs.length,
      currentTotal: allDocs.length,
    });

    if (data.page === 1) {
      // ✅ First page → replace all
      console.log('[OccupationModal] Setting initial data');
      setAllDocs(data.docs);
    } else {
      // ✅ Subsequent pages → append (with deduplication)
      setAllDocs((prev) => {
        const existingCodes = new Set(prev.map((d) => d.code));
        const newDocs = data.docs.filter((d) => !existingCodes.has(d.code));
        
        console.log('[OccupationModal] Appending:', {
          prevCount: prev.length,
          newCount: newDocs.length,
          totalAfter: prev.length + newDocs.length,
        });

        if (newDocs.length === 0) {
          console.warn('[OccupationModal] No new docs to append (all duplicates)');
          return prev;
        }

        return [...prev, ...newDocs];
      });
    }
  }, [data, normalizedSearch]); // ✅ Only data and normalizedSearch in deps

  // ✅ Load more handler
  const handleLoadMore = useCallback(() => {
    if (!data) {
      console.log('[OccupationModal] Load more: no data yet');
      return;
    }
    if (isFetching) {
      console.log('[OccupationModal] Load more: already fetching');
      return;
    }
    if (page >= data.totalPages) {
      console.log('[OccupationModal] Load more: no more pages');
      return;
    }

    // Check if next page already loaded
    const loadedPages = loadedPagesRef.current.get(normalizedSearch);
    if (loadedPages?.has(page + 1)) {
      console.log('[OccupationModal] Load more: next page already loaded');
      return;
    }

    console.log('[OccupationModal] Load more: requesting page', page + 1);
    setPage((p) => p + 1);
  }, [isFetching, data, page, normalizedSearch]);

  const handleSelect = (occ: Occupation) => {
    console.log('[OccupationModal] Selected:', occ);
    onSelect(occ);
    onClose();
  };

  // ✅ Loading states
  const isFirstLoad = isLoading && page === 1 && allDocs.length === 0;
  const isLoadingMore = isFetching && page > 1;

  const renderItem = ({ item, index }: { item: Occupation; index: number }) => {
    const isSelected = item.code === selectedCode;
    return (
      <TouchableOpacity
        style={[
          M.item,
          {
            backgroundColor: isSelected
              ? colors.primaryDim ?? colors.cardHover
              : 'transparent',
            borderBottomColor: colors.borderSoft,
          },
        ]}
        onPress={() => handleSelect(item)}
        activeOpacity={0.7}
      >
        <View style={{ flex: 1 }}>
          <Text style={[M.itemTitle, { color: colors.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={[M.itemCode, { color: colors.text3 }]}>
            {item.code}
          </Text>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[M.root, { backgroundColor: colors.bg }]}>
        {/* Header */}
        <View
          style={[
            M.header,
            {
              paddingTop: insets.top + Spacing[2],
              borderBottomColor: colors.borderSoft,
            },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[M.headerTitle, { color: colors.text }]}>
              Select Occupation
            </Text>
            {allDocs.length > 0 && (
              <Text style={[M.headerSub, { color: colors.text2 }]}>
                {allDocs.length} loaded
                {data && data.totalPages > 1
                  ? ` • Page ${page}/${data.totalPages}`
                  : ''}
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={10}
            style={[M.closeBtn, { backgroundColor: colors.cardHover }]}
          >
            <Ionicons name="close" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View
          style={[
            M.searchWrap,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons name="search-outline" size={18} color={colors.text2} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search occupation..."
            placeholderTextColor={colors.text3}
            style={[M.searchInput, { color: colors.text }]}
            autoFocus
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.text3} />
            </TouchableOpacity>
          )}
        </View>

        {/* Content */}
        {isFirstLoad ? (
          <View style={M.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[M.emptyText, { color: colors.text2 }]}>
              Loading occupations...
            </Text>
          </View>
        ) : error ? (
          <View style={M.center}>
            <Ionicons name="alert-circle-outline" size={44} color={colors.red} />
            <Text style={[M.emptyText, { color: colors.red }]}>
              Failed to load occupations
            </Text>
            <TouchableOpacity
              onPress={() => {
                setPage(1);
                setAllDocs([]);
                loadedPagesRef.current.clear();
              }}
              style={{
                marginTop: Spacing[3],
                paddingHorizontal: Spacing[4],
                paddingVertical: Spacing[2],
                backgroundColor: colors.cardHover,
                borderRadius: Radius.lg,
              }}
            >
              <Text style={{ color: colors.primary, fontWeight: '600' }}>
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        ) : allDocs.length === 0 ? (
          <View style={M.center}>
            <Ionicons name="briefcase-outline" size={44} color={colors.text3} />
            <Text style={[M.emptyText, { color: colors.text2 }]}>
              {isFetching
                ? 'Searching...'
                : search
                ? `No results for "${search}"`
                : 'No occupations found'}
            </Text>
            {isFetching && (
              <ActivityIndicator
                color={colors.primary}
                style={{ marginTop: 8 }}
              />
            )}
          </View>
        ) : (
          <FlatList
            data={allDocs}
            keyExtractor={(item, index) => `${item.code}__${index}`}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
            showsVerticalScrollIndicator={false}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            keyboardShouldPersistTaps="handled"
            removeClippedSubviews={false}
            maxToRenderPerBatch={20}
            windowSize={10}
            ListFooterComponent={
              isLoadingMore ? (
                <View
                  style={{
                    paddingVertical: Spacing[5],
                    alignItems: 'center',
                  }}
                >
                  <ActivityIndicator color={colors.primary} />
                  <Text
                    style={[
                      M.emptyText,
                      { color: colors.text2, marginTop: 4 },
                    ]}
                  >
                    Loading page {page}...
                  </Text>
                </View>
              ) : data && page >= data.totalPages && allDocs.length > 0 ? (
                <View
                  style={{ paddingVertical: Spacing[4], alignItems: 'center' }}
                >
                  <Text style={[M.emptyText, { color: colors.text3 }]}>
                    ✓ All {allDocs.length} occupations loaded
                  </Text>
                </View>
              ) : null
            }
          />
        )}
      </View>
    </Modal>
  );
}

const M = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing[3],
  },
  headerTitle: { fontSize: Typography.lg, fontWeight: '800' },
  headerSub: { fontSize: Typography.xs, marginTop: 2 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: Spacing[4],
    marginVertical: Spacing[3],
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[3],
    borderRadius: Radius.xl,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.sm,
    paddingVertical: 0,
  },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing[3],
  },
  itemTitle: {
    fontSize: Typography.sm,
    fontWeight: '600',
    lineHeight: 20,
  },
  itemCode: {
    fontSize: Typography.xs,
    marginTop: 2,
    fontWeight: '500',
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[3],
    paddingHorizontal: Spacing[6],
  },
  emptyText: { fontSize: Typography.sm, textAlign: 'center' },
});