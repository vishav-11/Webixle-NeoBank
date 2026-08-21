/**
 * cardConstants.ts
 * Status maps and label maps for Tevau card provider.
 */

export const TEVAU_TYPE_MAP: Record<number, 'PHYSICAL' | 'VIRTUAL'> = {
  1: 'PHYSICAL',
  2: 'VIRTUAL',
};

export const TEVAU_STATUS_MAP: Record<number, string> = {
  1:  'PROCESSING',
  2:  'PROCESSING',
  3:  'PROCESSING',
  4:  'ACTIVE',
  5:  'FROZEN',
  6:  'CLOSED',
  7:  'FROZEN',
  8:  'FROZEN',
  9:  'FROZEN',
  10: 'PROCESSING',
  11: 'PROCESSING',
};

export const TEVAU_STATUS_LABELS: Record<number, string> = {
  1:  'Applying',
  2:  'In Production',
  3:  'Shipped',
  4:  'Activated',
  5:  'Closing',
  6:  'Closed',
  7:  'Frozen',
  8:  'Locked',
  9:  'Expired',
  10: 'To be Bound',
  11: 'To be Activated',
};

export const TEVAU_KYC_STATUS_MAP: Record<number, string> = {
  0: 'PENDING',
  1: 'VERIFIED',
  2: 'REJECTED',
  3: 'REJECTED',
  5: 'NOT_STARTED',
};

export const TEVAU_KYC_STATUS_LABELS: Record<number, string> = {
  0: 'Verifying',
  1: 'Verified',
  2: 'Rejected',
  3: 'Invalidated',
  5: 'Unverified',
};

export const ID_CARD_TYPES = [
  { value: 'ID_CARD',          label: 'ID Card' },
  { value: 'PASSPORT',         label: 'Passport' },
  { value: 'DRIVERS',          label: "Driver's License" },
  { value: 'DRIVER_LICENSE',   label: 'Driver License' },
  { value: 'RESIDENCE_PERMIT', label: 'Residence Permit' },
] as const;
