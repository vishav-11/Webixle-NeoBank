/**
 * assetCache.ts
 * In-memory asset resolver.
 * Fetches assets by chainId once per session, caches forever.
 */

import { useState, useEffect, useRef } from 'react';
import { api } from '@/services/apiClient';
import { ENDPOINTS } from '@/services/endpoints';
import type { ResolvedAsset } from '@/types/p2pTypes';

// cache: chainId → Map<assetId, ResolvedAsset>
const cache    = new Map<string, Map<string, ResolvedAsset>>();
// in-flight promise per chainId
const inflight = new Map<string, Promise<void>>();

// ✅ Global listeners — jab chain load ho, sab subscribed hooks re-render karein
const listeners = new Map<string, Set<() => void>>();

const KNOWN_CHAINS = ['ETH', 'TRON', 'TRX', 'BTC', 'BNB', 'SOL', 'BSC'];

// ── Internal fetch ────────────────────────────────────────────────────────────

async function fetchChain(chainId: string): Promise<void> {
  try {
    const res = await api.get(ENDPOINTS.WALLET.GET_ASSETS_BY_CHAIN, { chainId: chainId?.toLowerCase() === 'trx' ? 'TRON' : chainId }) as any;
    const assets: any[] = Array.isArray(res?.data) ? res.data : [];
    const map = new Map<string, ResolvedAsset>();

    for (const a of assets) {
      if (a?._id) {
        map.set(a._id, {
          _id:     a._id,
          symbol:  a.symbol   ?? '???',
          name:    a.name     ?? a.symbol ?? 'Unknown',
          chainId: a.chainId  ?? chainId,
        });
      }
    }
    cache.set(chainId, map);
  } catch {
    // Empty map so we don't retry every render
    cache.set(chainId, new Map());
  } finally {
    inflight.delete(chainId);

    // ✅ Notify all hooks waiting for this chain
    listeners.get(chainId)?.forEach(cb => cb());
    listeners.delete(chainId);
  }
}

// ── Listener helpers ──────────────────────────────────────────────────────────

function subscribeChain(chainId: string, cb: () => void): () => void {
  if (!listeners.has(chainId)) listeners.set(chainId, new Set());
  listeners.get(chainId)!.add(cb);
  return () => listeners.get(chainId)?.delete(cb);
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Ensure assets for a chainId are loaded (idempotent) */
export async function warmChain(chainId: string): Promise<void> {
  if (cache.has(chainId)) return;
  if (!inflight.has(chainId)) {
    inflight.set(chainId, fetchChain(chainId));
  }
  return inflight.get(chainId)!;
}

/** Pre-warm all common chains in parallel */
export async function warmAllChains(): Promise<void> {
  await Promise.allSettled(KNOWN_CHAINS.map(warmChain));
}

/**
 * Sync resolve — returns placeholder if not yet cached.
 * Safe to call during render.
 */
export function resolveAsset(assetId: string, chainId: string): ResolvedAsset {
  if (!assetId) return { _id: '', symbol: '???', name: 'Unknown', chainId };

  // ✅ Check both chainId variants (ETH / TRON etc)
  const normalizedChain = chainId?.toUpperCase();

  if (!cache.has(normalizedChain)) {
    warmChain(normalizedChain); // fire-and-forget
    return { _id: assetId, symbol: '…', name: 'Loading…', chainId: normalizedChain };
  }

  const map = cache.get(normalizedChain)!;
  const found = map.get(assetId);

  if (found) return found;

  // ✅ Fallback: search all chains if not found in specific chain
  for (const [, chainMap] of cache) {
    const crossChain = chainMap.get(assetId);
    if (crossChain) return crossChain;
  }

  return {
    _id:    assetId,
    symbol: `…${assetId.slice(-4).toUpperCase()}`, // show last 4 chars as hint
    name:   'Unknown',
    chainId: normalizedChain,
  };
}

/**
 * React hook — resolves an asset ID and re-renders when chain loads.
 *
 * @example
 *   const asset = useResolvedAsset(ad.asset, ad.chainId);
 *   <Text>{asset.symbol}</Text>
 */
export function useResolvedAsset(assetId: string, chainId: string): ResolvedAsset {
  const normalizedChain = chainId?.toUpperCase() ?? '';

  const [resolved, setResolved] = useState<ResolvedAsset>(() =>
    resolveAsset(assetId, normalizedChain)
  );

  // ✅ Track latest values for callback
  const latestRef = useRef({ assetId, chainId: normalizedChain });
  useEffect(() => {
    latestRef.current = { assetId, chainId: normalizedChain };
  });

  useEffect(() => {
    if (!assetId || !normalizedChain) return;

    // Re-resolve immediately (handles cache-hit case)
    const immediate = resolveAsset(assetId, normalizedChain);
    setResolved(immediate);

    // Already fully resolved — done
    if (immediate.symbol !== '…') return;

    // ✅ Subscribe to chain load event
    const unsubscribe = subscribeChain(normalizedChain, () => {
      const { assetId: id, chainId: cid } = latestRef.current;
      setResolved(resolveAsset(id, cid));
    });

    // Also trigger warmChain in case it hasn't started
    warmChain(normalizedChain);

    return unsubscribe;
  }, [assetId, normalizedChain]);

  return resolved;
}

/**
 * Returns all cached assets for a chainId (or all chains if omitted).
 */
export function getCachedAssets(chainId?: string): ResolvedAsset[] {
  if (chainId) {
    return Array.from(cache.get(chainId?.toUpperCase())?.values() ?? []);
  }
  const all: ResolvedAsset[] = [];
  for (const map of cache.values()) all.push(...map.values());
  return all;
}

/**
 * Check if a chain is currently loading
 */
export function isChainLoading(chainId: string): boolean {
  return inflight.has(chainId?.toUpperCase());
}

/**
 * Check if a chain is cached
 */
export function isChainCached(chainId: string): boolean {
  return cache.has(chainId?.toUpperCase());
}