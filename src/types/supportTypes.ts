// types/support.types.ts

/**
 * Support & Help Types
 * Matches your API endpoints structure
 */

// ─── FAQ ──────────────────────────────────────────────────────────────────────
export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category?: string;
  createdAt?: string;
}

// ─── Support Ticket / Contact ─────────────────────────────────────────────────
export interface SupportTicket {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: "open" | "in-progress" | "resolved" | "closed";
  createdAt: string;
  updatedAt?: string;
  adminResponse?: string;
  adminResponseAt?: string;
}

// ─── Create Contact Payload ───────────────────────────────────────────────────
export interface CreateContactPayload {
  title: string;
  description: string;
}

// ─── API Response Wrappers ────────────────────────────────────────────────────
export interface GetFAQsResponse {
  success: boolean;
  data: FAQ[];
  message?: string;
}

export interface CreateContactResponse {
  success: boolean;
  data: SupportTicket;
  message?: string;
}

export interface GetMyContactsResponse {
  success: boolean;
  data: SupportTicket[];
  message?: string;
}