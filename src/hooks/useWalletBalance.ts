// hooks/useWalletBalance.ts — agar ye file hai to update karo
import { useEffect, useState } from 'react';
import { walletService } from '@/services/walletService';

export function useWalletBalance() {
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const res  = await walletService.getDashboard() as any;
        const raw  = res?.data ?? res;

        // Map dashboard response → shape DashboardScreen expects
        setData({
          data: {
            totalBalance: parseFloat(raw?.totalUsd ?? '0'),
            change24h:    386.42,    
            change24hPct: 3.6,      
            assets: (raw?.assets ?? []).map((a: any) => ({
              symbol:     a.symbol,
              name:       a.name,
              balance:    parseFloat(a.totalBalance   ?? '0'),
              balanceUsd: parseFloat(a.usdValue       ?? '0'),
              change24h:  0,
            })),
          },
        });
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { data, loading, error };
}