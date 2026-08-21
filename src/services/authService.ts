import { api } from './apiClient';
import { ENDPOINTS } from './endpoints';

export interface LoginPayload    { email: string; password: string }
export interface RegisterPayload { firstName: string; email: string; password: string; referralCode?: string }
export interface OTPPayload      { email: string; otp: string }

// ✅ Fixed: matches actual API shape
export interface AuthResponse {
  status:  string;          // "success" | "error"
  success?: boolean;        // keep optional for backward compat
  message: string;
  data?: {
    token?: string;
    user?:  UserProfile;
  };
}

export interface verifyPasswordPayload{
  otp:number
  newPassword:string
}

export type InterlaceKycStatus = 'pending' | 'approved' | 'rejected' | 'not_started';

export interface UserProfile {
  _id:         string;
  firstName:   string;
  lastName:    string;
  email:       string;
  role:        string;
  avatar:      string | null;
  kycStatus:   string;
  isEmailVerified:             boolean;
  isMailVerifiedAfterRegister: boolean;
  twoFactorEnabled:            boolean;
  twoFactorMethod?:            string;
  referralCode:                string;
  profileStatus:               string;
  createdAt:                   string;
  updatedAt:                   string;

  // ✅ Naye fields add karo
  DOB?:         string;
  address?:     string;
  mobileCode?:  string;
  mobileNo?:    string;
  dailySwapLimit?: number;
  signUpBonus?:    number;

    interlaceAccountCreated: boolean;
  interlaceKycStatus: InterlaceKycStatus;
  interlaceAccountId: string | null;
  interlaceDisplayId: string | null;
}

export interface UpdateProfilePayload {
  firstName?:  string;
  lastName?:   string;
  mobileCode?: string;
  mobileNo?:   string;
  address?:    string;
  DOB?:        string;
}


 
// ✅ Helper to normalize both API shapes
export function isSuccess(res: AuthResponse): boolean {
  return res.status === 'success' || res.success === true;
}

export const authService = {
  login: (payload: LoginPayload) =>
    api.post<AuthResponse>(ENDPOINTS.AUTH.LOGIN, payload),

  register: (payload: RegisterPayload) =>
    api.post<AuthResponse>(ENDPOINTS.AUTH.REGISTER, payload),

  sendOTP: (email: string) =>
    api.post<AuthResponse>(ENDPOINTS.AUTH.SEND_OTP, { email }),

  verifyOTP: (payload: OTPPayload) =>
    api.post<AuthResponse>(ENDPOINTS.AUTH.VERIFY_OTP, payload),

  getProfile: () =>
    api.get<AuthResponse>(ENDPOINTS.AUTH.PROFILE),

  logout: () =>
    api.post<AuthResponse>(ENDPOINTS.AUTH.LOGOUT),

  forgotPassword: (email: string) =>
    api.post<AuthResponse>(ENDPOINTS.AUTH.FORGOT_PASSWORD, { email }),
 verifyForgetPasswordPassword: (otp: number, newPassword: string) =>
  api.post<AuthResponse>(ENDPOINTS.AUTH.RESET_PASSWORD, { otp, newPassword }),
  resetPassword: (token: string, password: string) =>
    api.post<AuthResponse>(ENDPOINTS.AUTH.RESET_PASSWORD, { token, password }),
   updateProfile: (userId: string, payload: UpdateProfilePayload) =>
    api.put<AuthResponse>(ENDPOINTS.AUTH.UPDATE_PROFILE(userId), payload),


};