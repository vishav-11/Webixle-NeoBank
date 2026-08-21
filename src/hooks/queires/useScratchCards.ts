import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scratchCardService } from '@/services/scratchCardService';
import type { AssignedScratchCard } from '@/services/scratchCardService';

export const scratchCardKeys = {
  myCards: ['scratchCards', 'my'] as const,
};

export function useMyScratchCards() {
  return useQuery({
    queryKey: scratchCardKeys.myCards,
    queryFn: async () => {
      const res = await scratchCardService.getMyCards() as any;

      // ✅ Flat array directly in data
      const data: AssignedScratchCard[] = res?.data ?? [];
      return data;
    },
    staleTime: 1000 * 60,
  });
}

export function useOpenScratchCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assignedCardId: string) =>
      scratchCardService.openCard(assignedCardId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scratchCardKeys.myCards });
    },
  });
}

export function useRedeemScratchCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assignedCardId: string) =>
      scratchCardService.redeemCard(assignedCardId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scratchCardKeys.myCards });
    },
  });
}