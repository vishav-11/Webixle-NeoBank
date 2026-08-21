// services/kycService.ts
import { api } from './apiClient';
import { ENDPOINTS } from './endpoints';

export interface KycInitiateResponse {
  status: string;
  data: {
    url:        string;
    sessionId:  string;
    user?: {
      kycStatus: string;
      kycUrl?:   string;
    };
  };
}

// ✅ Dedicated status response shape
export interface KycStatusResponse {
  kycStatus:      string;
  kycNote?:       string | null;
  kycUrl?:        string | null;
  sessionId?:     string;
  tevauKycStatus?: string;
}

export const kycService = {
  // ✅ KYC start/resubmit
  initiate: () =>
    api.post<KycInitiateResponse>(ENDPOINTS.KYC.INITIATE),

  // ✅ Dedicated status API — profile se nahi
  getStatus: async (): Promise<KycStatusResponse> => {
    const res = await api.get<{ status: string; data: KycStatusResponse }>(
      ENDPOINTS.KYC.STATUS,
    );
    // ✅ Normalize — data ke andar status object hoga
    return res.data;
  },
};