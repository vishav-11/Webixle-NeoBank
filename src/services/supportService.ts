// services/supportService.ts

import { api } from "./apiClient";
import { ENDPOINTS } from "./endpoints";
import type {
  FAQ,
  SupportTicket,
  CreateContactPayload,
} from "@/types/supportTypes";

/**
 * SupportService
 * Updated to match actual API response structure
 */

// ─── API Response Types (Actual Structure) ────────────────────────────────────
interface GetFAQsResponse {
  message: string;
  status: boolean;
  faqs: Array<{
    _id: string;
    question: string;
    answer: string;
    type: string;
    status: string;
    createdAt: string;
    updatedAt?: string;
    __v?: number;
  }>;
}

interface CreateContactResponse {
  message: string;
  status: boolean;
  data: any; // Replace with actual ticket structure when you test
}

interface GetMyContactsResponse {
  message: string;
  status: boolean;
  contacts: any[]; // Replace with actual structure
}

// ─── Get FAQs ─────────────────────────────────────────────────────────────────
export const getFaqs = async (): Promise<FAQ[]> => {
  try {
    const response = await api.get<GetFAQsResponse>(ENDPOINTS.SUPPORT.GET_FAQ);

    if (!response.status) {
      throw new Error(response.message || "Failed to fetch FAQs");
    }

    // Map backend structure to your FAQ type
    return response.faqs.map((faq) => ({
      id: faq._id,
      question: faq.question,
      answer: faq.answer,
      category: faq.type,
      createdAt: faq.createdAt,
    }));
  } catch (error: any) {
    console.error("❌ SupportService.getFaqs:", error);
    throw new Error(error.message || "Failed to load FAQs");
  }
};

// ─── Create Support Ticket ────────────────────────────────────────────────────
export const createSupportTicket = async (
  payload: CreateContactPayload
): Promise<SupportTicket> => {
  try {
    const response = await api.post<CreateContactResponse>(
      ENDPOINTS.SUPPORT.CREATE_CONTACT,
      payload
    );

    if (!response.status) {
      throw new Error(response.message || "Failed to create support ticket");
    }

    // Map response to your SupportTicket type
    const ticket = response.data;
    return {
      id: ticket._id || ticket.id,
      userId: ticket.userId,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      adminResponse: ticket.adminResponse,
      adminResponseAt: ticket.adminResponseAt,
    };
  } catch (error: any) {
    console.error("❌ SupportService.createSupportTicket:", error);
    throw new Error(error.message || "Failed to create support ticket");
  }
};

// ─── Get My Support Tickets ───────────────────────────────────────────────────
export const getMySupportTickets = async (): Promise<SupportTicket[]> => {
  try {
    const response = await api.get<GetMyContactsResponse>(
      ENDPOINTS.SUPPORT.GET_MY_CONTACTS
    );

    if (!response.status) {
      throw new Error(response.message || "Failed to fetch support tickets");
    }

    // Map contacts array to SupportTicket[]
    return response.contacts.map((ticket: any) => ({
      id: ticket._id || ticket.id,
      userId: ticket.userId,
      title: ticket.title,
      description: ticket.description || ticket.discription, // Handle typo
      status: ticket.status,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      adminResponse: ticket.adminResponse,
      adminResponseAt: ticket.adminResponseAt,
    }));
  } catch (error: any) {
    console.error("❌ SupportService.getMySupportTickets:", error);
    throw new Error(error.message || "Failed to load support tickets");
  }
};

// ─── Helper: Get System Status ────────────────────────────────────────────────
export const getSystemStatus = (): {
  operational: boolean;
  message: string;
  lastChecked: string;
} => {
  return {
    operational: true,
    message: "All systems operational",
    lastChecked: new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }),
  };
};

// ─── Export Default ───────────────────────────────────────────────────────────
export default {
  getFaqs,
  createSupportTicket,
  getMySupportTickets,
  getSystemStatus,
};