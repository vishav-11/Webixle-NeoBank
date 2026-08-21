// services/twoFactorService.ts
import { api } from './apiClient';
import { ENDPOINTS } from './endpoints';

const BASE = '/users';

export interface ToggleResponse {
  status:   string;
  success:  boolean;
  otpSent?: boolean;
  message:  string;
}

export interface VerifyEmailResponse {
  status:   string;
  success:  boolean;
  message:  string;
  twoFactorEnabled?: boolean;
}

export interface SetupAuthenticatorResponse {
  success:  boolean;
  secret:   string;
  qrCode:   string;  // base64 image
  otpauth:  string;
}

export interface VerifyAuthenticatorResponse {
  success: boolean;
  message: string;
  twoFactorEnabled?: boolean;
}

export const twoFactorService = {
  // ✅ Toggle 2FA — enable:true → OTP bhejta hai email pe
  toggle: (enable: boolean) =>
    api.post<ToggleResponse>(ENDPOINTS.USER.TOGGLE_2FA, { enable }),

  // ✅ Email OTP verify
  verifyEmail: (code: string) =>
    api.post<VerifyEmailResponse>(ENDPOINTS.USER.VERIFY_EMAIL_2FA, { code }),

  // ✅ Authenticator setup — QR code milega
  setupAuthenticator: () =>
    api.post<SetupAuthenticatorResponse>(ENDPOINTS.USER.SETUP_AUTHENTICATOR),

  // ✅ Authenticator code verify
  verifyAuthenticator: (code: string) =>
    api.post<VerifyAuthenticatorResponse>(
      ENDPOINTS.USER.VERIFY_AUTHENTICATOR,
      { code },
    ),
};