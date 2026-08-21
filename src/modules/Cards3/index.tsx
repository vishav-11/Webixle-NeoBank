// src/modules/Cards3/index.ts
// Drop this whole "CardModule" folder into any project (e.g. as
// src/modules/Cards/) and call:
//   import CardsScreen from '@/modules/Cards';
// Only external deps needed by the project: apiClient, ThemeContext,
// styles/theme, expo-router, expo-linear-gradient, expo-image-picker,
// @expo/vector-icons, react-native-safe-area-context,
// @tanstack/react-query, and the app's own useProfile hook
// (imported from '@/hooks/queires' — see KycFormScreen.tsx / CreateCardScreen.tsx,
// update the import path there if your project uses a different alias).

import CardsScreen from './CardsScreen';
export default CardsScreen;

export { cardService } from './service';
export {
  useCards,
  useCardSummary,
  useCardReveal,
  useFreezeCard,
  useUnfreezeCard,
  useUpdateCardSettings,
  useDeleteCard,
  useCreateCard,
  useBudgets,
  useCreateBudget,
  useCreateBudgetCard,
  useCreateInterlaceAccount,
  useOccupations,
  useSubmitAccountKyc,
  useKycVerificationResult,
  useUploadKycFiles,
  useRecommendedBin,
  useCardBins,
  useCreateCardholder,
  useCardholder,
  useCardholders,
  useTriggerCardholderKyc,
  useCardModuleStage,
  // ── Card management ──
  useUpdateCardPin,
  useCardAccessToken,
  useCardTransactionScenarios,
  useSetCardTransactionScenarios,
  useNegativeBalanceCards,
  useBatchDeleteCards,
} from './hooks';
export {
  CARD_ENDPOINTS, CARD_KEYS, CARD_FACE, STATUS_META,
  ID_TYPES, ACCOUNT_PURPOSE_OPTIONS, SOURCE_TYPE_OPTIONS,
  MOCK_CARDS, MOCK_REVEAL, MOCK_SUMMARY, MOCK_BINS, MOCK_OCCUPATIONS,
  validateCardPin, SCENARIO_TYPE_OPTIONS, SCENE_OPTIONS,
} from './constants';
export type {
  CardInfo,
  CardDesign,
  CardStatus,
  CardListResponse,
  CardSummaryResponse,
  CardRevealResponse,
  CardActionResponse,
  UpdateCardPayload,
  DeleteCardPayload,
  InterlaceAccount,
  InterlaceKycStatus,
  CardModuleStage,
  SubmitAccountKycPayload,
  KycVerificationResult,
  CardBin,
  CreateCardholderPayload,
  CardholderInfo,
  CreateCardPayload,
  Budget,
  CreateBudgetPayload,
  CreateBudgetCardPayload,
  CardCreationType,
  // ── Card management ──
  UpdateCardPinPayload,
  CardAccessTokenResponse,
  CardTransactionScenario,
  SetTransactionScenariosPayload,
  ScenarioType,
  NegativeBalanceCard,
  NegativeBalanceQuery,
  BatchDeleteCardsPayload,
} from './types';

export { default as NoAccountScreen } from './screens/NoAccountScreen';
export { default as KycFormScreen } from './screens/KycFormScreen';
export { default as KycPendingScreen } from './screens/KycPendingScreen';
export { default as CreateCardScreen } from './screens/CreateCardScreen';
export { default as CardPendingScreen } from './screens/CardPendingScreen';
export { default as ManageCardsScreen } from './screens/ManageCardsScreen';
export { default as FreezeConfirmModal } from './components/FreezeConfirmModal';
export { default as CardSettingsSheet } from './components/CardSettingsSheet';
export { default as SetPinModal } from './components/SetPinModal';
export { default as CardDetailsModal } from './components/CardDetailsModal';
export { default as SpendControlsModal } from './components/SpendControlsModal';
