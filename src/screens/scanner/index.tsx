/**
 * scan-pay.tsx — Full updated code with debugging & theme integration
 */

import React, {
  useState, useCallback, useEffect, useMemo, useRef, memo,
} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Modal, Platform, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/context/ThemeContext';
import { Radius, Spacing, Typography } from '@/styles/theme';
import {
  useSupportedBlockchains,
  useAssetsByChain,
  useAssetBalance,
  useSendCrypto,
  type WalletAsset,
} from '@/hooks/queires';
import { TransferInstructionModal } from '@/components/common/TransferInstructionModal';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Blockchain {
  id: string;
  name: string;
  native_currency: string;
  chainId: number | null;
  image?: { thumb?: string; small?: string; large?: string };
}

// ─── Constants ────────────────────────────────────────────────────────────────
const IS_WEB        = Platform.OS === 'web';
const QUICK_AMOUNTS = [0.25, 0.5, 1.0];
const DEBUG_MODE    = __DEV__;

const COIN_COLORS: Record<string, [string, string]> = {
  BTC:  ['#F7931A', '#E8830A'],
  ETH:  ['#627EEA', '#4A6DD8'],
  TRX:  ['#FF5570', '#E83050'],
  BNB:  ['#FFB23F', '#E09510'],
  USDT: ['#26A17B', '#1A8A66'],
  USDC: ['#2775CA', '#1A60B5'],
};

// ─── Address → Chain detection ────────────────────────────────────────────────
type DetectedChainType = 'ETH_BSC' | 'TRX' | 'BTC' | null;

const detectChainFromAddress = (raw: string): DetectedChainType => {
  if (!raw) return null;
  const t = raw.trim();
  
  if (DEBUG_MODE) console.log('🔍 Detecting chain for:', t.substring(0, 20) + '...');
  
  if (/^ethereum:/i.test(t))                         return 'ETH_BSC';
  if (/^tron:/i.test(t))                             return 'TRX';
  if (/^bitcoin:/i.test(t))                          return 'BTC';
  if (/^0x[a-fA-F0-9]{40}$/.test(t))                return 'ETH_BSC';
  if (/^T[a-zA-Z0-9]{33}$/.test(t))                 return 'TRX';
  if (/^(1|3|bc1)[a-zA-Z0-9]{25,62}$/.test(t))      return 'BTC';
  
  return null;
};

const filterBlockchainsByDetectedType = (
  blockchains: Blockchain[],
  detectedType: DetectedChainType,
): Blockchain[] => {
  if (!detectedType) return blockchains;
  
  let filtered: Blockchain[] = [];
  
  switch (detectedType) {
    case 'ETH_BSC':
      filtered = blockchains.filter(c =>
        c.id === 'ethereum' || c.id === 'binance-smart-chain' ||
        c.native_currency.toUpperCase() === 'ETH' ||
        c.native_currency.toUpperCase() === 'BNB'
      );
      break;
    case 'TRX':
      filtered = blockchains.filter(c =>
        c.id === 'tron' || c.native_currency.toUpperCase() === 'TRX'
      );
      break;
    case 'BTC':
      filtered = blockchains.filter(c =>
        c.id === 'bitcoin' || c.native_currency.toUpperCase() === 'BTC'
      );
      break;
    default:
      filtered = blockchains;
  }
  
  if (DEBUG_MODE) console.log(`✅ Filtered ${filtered.length} chains for type:`, detectedType);
  return filtered;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getCoinColors = (symbol: string): [string, string] =>
  COIN_COLORS[symbol?.toUpperCase()] ?? ['#334155', '#1E293B'];

const getApiChainId = (chain: Blockchain): string => {
  const map: Record<string, string> = {
    'ethereum':            'ETH',
    'binance-smart-chain': 'BSC',
    'tron':                'TRX',
    'bitcoin':             'BTC',
  };
  return map[chain.id] ?? chain.native_currency;
};

const validateAddress = (address: string, chainKey: string): boolean => {
  if (!address || address.length < 10) return false;
  switch (chainKey.toUpperCase()) {
    case 'ETH': case 'BSC': return /^0x[a-fA-F0-9]{40}$/.test(address);
    case 'TRX':             return /^T[a-zA-Z0-9]{33}$/.test(address);
    case 'BTC':             return /^(1|3|bc1)[a-zA-Z0-9]{25,62}$/.test(address);
    default:                return address.length > 10;
  }
};

const extractAddress = (raw: string): string => {
  if (!raw) return '';
  const m = raw.trim().match(/^[a-zA-Z0-9.\-]+:([^?]+)/);
  const result = m ? m[1] : raw.trim();
  
  if (DEBUG_MODE) console.log('📋 Extracted address:', result.substring(0, 20) + '...');
  return result;
};

const formatBal = (b?: string | number, decimals = 6): string => {
  const n = typeof b === 'number' ? b : parseFloat(b ?? '0');
  if (isNaN(n)) return '0.00';
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: Math.min(decimals, 8),
  });
};

const showAlert = (title: string, message?: string, buttons?: any[]) => {
  if (Platform.OS === 'web') {
    const msg = `${title}${message ? `\n\n${message}` : ''}`;
    if (buttons && buttons.length > 1) {
      const ok = window.confirm(msg);
      if (ok) buttons.find(b => b.text !== 'Cancel')?.onPress?.();
      else    buttons.find(b => b.text === 'Cancel')?.onPress?.();
    } else {
      window.alert(msg);
      buttons?.[0]?.onPress?.();
    }
  } else {
    const { Alert } = require('react-native');
    Alert.alert(title, message, buttons);
  }
};

// ─── QR decode from image ─────────────────────────────────────────────────────
const decodeQrFromImageUri = async (uri: string): Promise<string | null> => {
  try {
    if (DEBUG_MODE) console.log('🖼️ Decoding QR from image...');
    
    const timeoutPromise = new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error('Decode timeout')), 15000)
    );
    
    const decodePromise = (async () => {
      if (Platform.OS === 'web') {
        const resp = await fetch(uri);
        const blob = await resp.blob();
        const fd   = new FormData();
        fd.append('file', blob, 'qr.png');
        const res  = await fetch('https://api.qrserver.com/v1/read-qr-code/', {
          method: 'POST',
          body:   fd,
        });
        const json = await res.json();
        const data = json?.[0]?.symbol?.[0]?.data;
        return data && data !== 'null' ? data : null;
      } else {
        const FileSystem = require('expo-file-system');
        const base64     = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const blob = await fetch(`data:image/jpeg;base64,${base64}`).then(r => r.blob());
        const fd   = new FormData();
        fd.append('file', blob as any, 'qr.jpg');
        const res  = await fetch('https://api.qrserver.com/v1/read-qr-code/', {
          method: 'POST',
          body:   fd,
        });
        const json = await res.json();
        const data = json?.[0]?.symbol?.[0]?.data;
        return data && data !== 'null' ? data : null;
      }
    })();
    
    const result = await Promise.race([decodePromise, timeoutPromise]);
    
    if (DEBUG_MODE) {
      if (result) console.log('✅ QR decoded:', result.substring(0, 30) + '...');
      else console.log('❌ No QR found in image');
    }
    
    return result;
  } catch (err) {
    if (DEBUG_MODE) console.error('❌ QR decode error:', err);
    return null;
  }
};

// ─── BottomSheet ──────────────────────────────────────────────────────────────
function BottomSheet({ visible, title, onClose, colors, children }: any) {
  if (IS_WEB) {
    if (!visible) return null;
    return (
      <View style={bs.webBackdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} activeOpacity={1} />
        <View style={[bs.webPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[bs.hdr, { borderBottomColor: colors.border }]}>
            <Text style={[bs.title, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={[bs.closeBtn, { backgroundColor: colors.surface }]}>
              <Ionicons name="close" size={18} color={colors.text2} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
            {children}
            <View style={{ height: 16 }} />
          </ScrollView>
        </View>
      </View>
    );
  }
  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <View style={bs.nativeOverlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <View style={[bs.nativeSheet, { backgroundColor: colors.card }]}>
          <View style={[bs.handle, { backgroundColor: colors.border }]} />
          <View style={[bs.hdr, { borderBottomColor: colors.border }]}>
            <Text style={[bs.title, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.text2} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {children}
            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const bs = StyleSheet.create({
  webBackdrop:  {
    position: 'absolute' as any, top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  webPanel:     { width: '100%', maxWidth: 480, borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  nativeOverlay:{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  nativeSheet:  { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '80%', paddingBottom: 24 },
  handle:       { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  hdr:          {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  title:        { fontSize: 17, fontWeight: '700' },
  closeBtn:     { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});

// ─── ConfirmModal ─────────────────────────────────────────────────────────────
const ConfirmModal = memo(({
  visible, colors, isSending, chain, asset, recipient, amount, onCancel, onConfirm,
}: {
  visible: boolean; colors: any; isSending: boolean;
  chain: Blockchain | null; asset: WalletAsset | null;
  recipient: string; amount: string;
  onCancel: () => void; onConfirm: () => void;
}) => (
  <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
    <View style={conf.overlay}>
      <View style={[conf.card, { backgroundColor: colors.card, maxWidth: IS_WEB ? 440 : undefined }]}>
        <Text style={[conf.title, { color: colors.text }]}>Confirm Transaction</Text>
        {[
          { label: 'Network', value: chain?.name },
          { label: 'Asset',   value: `${asset?.name} (${asset?.symbol})` },
          { label: 'To',      value: recipient },
          { label: 'Amount',  value: `${amount} ${asset?.symbol}`, accent: true },
        ].map(({ label, value, accent }) => (
          <View key={label} style={[conf.row, { borderBottomColor: colors.borderSoft }]}>
            <Text style={[conf.lbl, { color: colors.text2 }]}>{label}</Text>
            <Text
              style={[conf.val, { color: accent ? colors.primary : colors.text },
                accent && { fontWeight: '700' }]}
              numberOfLines={1} ellipsizeMode="middle"
            >
              {value}
            </Text>
          </View>
        ))}
        <View style={conf.actions}>
          <TouchableOpacity style={[conf.cancelBtn, { backgroundColor: colors.surface }]} onPress={onCancel}>
            <Text style={[conf.cancelTxt, { color: colors.text2 }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[conf.sendBtn, isSending && { opacity: 0.6 }]}
            onPress={onConfirm} disabled={isSending} activeOpacity={0.85}
          >
            <LinearGradient
              colors={colors.primaryGradient}
              style={conf.sendGrad}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              {isSending
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={conf.sendTxt}>Confirm Send</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
));
ConfirmModal.displayName = 'ConfirmModal';

const conf = StyleSheet.create({
  overlay:   {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: Spacing[5], backgroundColor: 'rgba(0,0,0,0.78)',
  },
  card:      { width: '100%', borderRadius: Radius['2xl'], padding: Spacing[6] },
  title:     { fontSize: Typography.lg, fontWeight: '700', textAlign: 'center', marginBottom: Spacing[5] },
  row:       { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing[3], borderBottomWidth: 1 },
  lbl:       { fontSize: Typography.sm },
  val:       { fontSize: Typography.sm, flex: 1, textAlign: 'right', marginLeft: Spacing[3] },
  actions:   { flexDirection: 'row', gap: Spacing[3], marginTop: Spacing[5] },
  cancelBtn: { flex: 1, padding: Spacing[4], borderRadius: Radius.lg, alignItems: 'center' },
  cancelTxt: { fontSize: Typography.sm, fontWeight: '600' },
  sendBtn:   { flex: 1, borderRadius: Radius.lg, overflow: 'hidden' },
  sendGrad:  { padding: Spacing[4], alignItems: 'center', justifyContent: 'center' },
  sendTxt:   { fontSize: Typography.sm, fontWeight: '700', color: '#fff' },
});

// ─── DetectedChainBadge ───────────────────────────────────────────────────────
const DetectedChainBadge = memo(({
  detectedType, colors,
}: { detectedType: DetectedChainType; colors: any }) => {
  if (!detectedType) return null;
  const info: Record<string, { label: string; icon: string; hint: string }> = {
    ETH_BSC: { label: 'EVM Address (0x…)',  icon: 'layers-outline', hint: 'ETH & BSC networks detected' },
    TRX:     { label: 'Tron Address (T…)',   icon: 'flash-outline',  hint: 'TRON network detected'       },
    BTC:     { label: 'Bitcoin Address',     icon: 'logo-bitcoin',   hint: 'Bitcoin network detected'    },
  };
  const d = info[detectedType];
  if (!d) return null;
  return (
    <View style={[dcb.wrap, { backgroundColor: colors.greenDim, borderColor: colors.greenBorder }]}>
      <View style={dcb.row}>
        <View style={[dcb.iconWrap, { backgroundColor: colors.greenDim }]}>
          <Ionicons name={d.icon as any} size={16} color={colors.green} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[dcb.label, { color: colors.green }]}>{d.label}</Text>
          <Text style={[dcb.hint,  { color: colors.green, opacity: 0.8 }]}>{d.hint}</Text>
        </View>
        <Ionicons name="checkmark-circle" size={18} color={colors.green} />
      </View>
    </View>
  );
});
DetectedChainBadge.displayName = 'DetectedChainBadge';

const dcb = StyleSheet.create({
  wrap:    { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing[3] },
  row:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap:{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  label:   { fontSize: Typography.sm, fontWeight: '700' },
  hint:    { fontSize: Typography.xs, marginTop: 1 },
});

// ─── ImagePickerButton ────────────────────────────────────────────────────────
interface ImagePickerButtonProps {
  colors: any;
  onDecoded: (raw: string) => void;
}

const ImagePickerButton = memo(({ colors, onDecoded }: ImagePickerButtonProps) => {
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');

  const handlePick = useCallback(async () => {
    try {
      if (DEBUG_MODE) console.log('📂 Opening image picker...');
      
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showAlert(
          'Permission Required',
          'Please allow gallery access to pick a QR image.',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality:    1,
        base64:     false,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      setState('loading');
      const uri     = result.assets[0].uri;
      const decoded = await decodeQrFromImageUri(uri);

      if (decoded) {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setState('idle');
        onDecoded(decoded);
      } else {
        setState('error');
        showAlert(
          'No QR Found',
          'Could not detect a QR code in the selected image.\nTry a clearer photo or paste the address manually.',
          [{ text: 'OK', onPress: () => setState('idle') }],
        );
      }
    } catch (err) {
      if (DEBUG_MODE) console.error('❌ Image picker error:', err);
      setState('error');
      showAlert('Error', 'Failed to process image.', [
        { text: 'OK', onPress: () => setState('idle') },
      ]);
    }
  }, [onDecoded]);

  return (
    <TouchableOpacity
      onPress={handlePick}
      activeOpacity={0.8}
      disabled={state === 'loading'}
      style={[
        ipb.btn,
        {
          backgroundColor: colors.card,
          borderColor: state === 'error' ? colors.red : colors.border,
        },
      ]}
    >
      {state === 'loading' ? (
        <>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[ipb.txt, { color: colors.text2 }]}>Decoding…</Text>
        </>
      ) : (
        <>
          <View style={[ipb.iconWrap, {
            backgroundColor: state === 'error' ? colors.redDim : colors.primaryDim,
          }]}>
            <Ionicons
              name={state === 'error' ? 'close-circle-outline' : 'image-outline'}
              size={18}
              color={state === 'error' ? colors.red : colors.primary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[ipb.txt, {
              color: state === 'error' ? colors.red : colors.text,
            }]}>
              {state === 'error' ? 'No QR found — try again' : 'Pick QR from Gallery / Files'}
            </Text>
            <Text style={[ipb.sub, { color: colors.text3 }]}>
              {state === 'error'
                ? 'Select a clearer image'
                : 'Select a screenshot or saved QR image'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.text3} />
        </>
      )}
    </TouchableOpacity>
  );
});
ImagePickerButton.displayName = 'ImagePickerButton';

const ipb = StyleSheet.create({
  btn:     {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: Radius.xl, borderWidth: 1,
    paddingHorizontal: Spacing[4], paddingVertical: Spacing[4],
    minHeight: 64,
  },
  iconWrap:{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  txt:     { fontSize: Typography.sm, fontWeight: '600' },
  sub:     { fontSize: Typography.xs, marginTop: 2 },
});

// ═════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═════════════════════════════════════════════════════════════════════════════
export default function ScanPayScreen() {
  const { colors } = useTheme();
  const router     = useRouter();
  const insets     = useSafeAreaInsets();

  const [permission, requestPermission] = useCameraPermissions();
  const [scanned,    setScanned]        = useState(false);

  const [address,       setAddress]       = useState('');
  const [manualInput,   setManualInput]   = useState('');
  const [detectedType,  setDetectedType]  = useState<DetectedChainType>(null);
  const [step,          setStep]          = useState<'camera' | 'fill'>('camera');

  const [selectedChain,   setSelectedChain]   = useState<Blockchain | null>(null);
  const [selectedAsset,   setSelectedAsset]   = useState<WalletAsset | null>(null);
  const [amount,          setAmount]          = useState('');
  const [amountError,     setAmountError]     = useState('');
  const [amountFocused,   setAmountFocused]   = useState(false);
  const [showNetPicker,   setShowNetPicker]   = useState(false);
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [showInstruction, setShowInstruction] = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);

  const prevChainRef = useRef<string | null>(null);

  const { data: allBlockchains = [], isLoading: loadingChains } = useSupportedBlockchains();
  const { data: assets = [],         isLoading: loadingAssets  } = useAssetsByChain(
    selectedChain ? getApiChainId(selectedChain) : ''
  );
  const { data: rawBalance, isLoading: loadingBalance } = useAssetBalance(
    selectedChain ? getApiChainId(selectedChain) : undefined,
    selectedAsset?._id
  );
  const sendMutation = useSendCrypto();
  const isSending    = sendMutation.isPending;

  const filteredBlockchains = useMemo(
    () => filterBlockchainsByDetectedType(allBlockchains, detectedType),
    [allBlockchains, detectedType],
  );

  useEffect(() => {
    if (step === 'camera') {
      setScanned(false);
      if (DEBUG_MODE) console.log('📸 Camera opened, scanned state reset');
    }
  }, [step]);

  useEffect(() => {
    if (step === 'camera' && !IS_WEB && permission && !permission.granted && permission.canAskAgain) {
      if (DEBUG_MODE) console.log('🔐 Requesting camera permission...');
      requestPermission();
    }
  }, [step, permission, requestPermission]);

  useEffect(() => {
    if (filteredBlockchains.length === 1 && !selectedChain) {
      setSelectedChain(filteredBlockchains[0]);
      if (DEBUG_MODE) console.log('✅ Auto-selected chain:', filteredBlockchains[0].name);
    }
  }, [filteredBlockchains, selectedChain]);

  const availableBalance = useMemo(() => {
    if (rawBalance) return parseFloat(rawBalance as string);
    return parseFloat(selectedAsset?.balance ?? '0');
  }, [rawBalance, selectedAsset]);

  const enteredAmount   = parseFloat(amount) || 0;
  const networkFee      = parseFloat(selectedAsset?.withdrawalFee ?? '0.0002');
  const hasInsufficient = enteredAmount > availableBalance;
  const recipientGets   = Math.max(0, enteredAmount - networkFee);
  const finalAddress    = address || manualInput.trim();

  const isValidRecipient = useMemo(() => {
    if (!finalAddress) return false;
    if (selectedChain) return validateAddress(finalAddress, getApiChainId(selectedChain));
    return finalAddress.length > 10;
  }, [finalAddress, selectedChain]);

  const canSend = useMemo(() =>
    !!(selectedChain && selectedAsset && enteredAmount > 0 && !hasInsufficient && isValidRecipient),
    [selectedChain, selectedAsset, enteredAmount, hasInsufficient, isValidRecipient],
  );

  useEffect(() => {
    if (!selectedChain || selectedChain.id === prevChainRef.current) return;
    prevChainRef.current = selectedChain.id;
    setSelectedAsset(null);
    setAmount('');
  }, [selectedChain]);

  useEffect(() => {
    if (!amount)                   { setAmountError(''); return; }
    if (isNaN(parseFloat(amount))) { setAmountError('Invalid amount'); return; }
    if (parseFloat(amount) <= 0)   { setAmountError('Amount must be > 0'); return; }
    if (hasInsufficient) {
      setAmountError(`Insufficient. Available: ${formatBal(availableBalance, 6)}`); return;
    }
    setAmountError('');
  }, [amount, hasInsufficient, availableBalance]);

  const processAddress = useCallback((raw: string) => {
    const addr     = extractAddress(raw);
    const detected = detectChainFromAddress(raw);
    
    if (DEBUG_MODE) {
      console.log('🔄 Processing address:', { raw: raw.substring(0, 30) + '...', addr, detected });
    }
    
    setAddress(addr);
    setDetectedType(detected);
    setSelectedChain(null);
    setSelectedAsset(null);
    setAmount('');
    prevChainRef.current = null;
  }, []);

  const handleBarcodeScanned = useCallback((result: BarcodeScanningResult) => {
    if (DEBUG_MODE) console.log('📸 QR Scanned:', result.data.substring(0, 50) + '...');
    
    if (scanned) {
      if (DEBUG_MODE) console.log('⚠️ Already scanned, ignoring');
      return;
    }
    
    setScanned(true);
    processAddress(result.data);
    
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    setStep('fill');
  }, [scanned, processAddress]);

  const handleImageDecoded = useCallback((raw: string) => {
    processAddress(raw);
    setManualInput('');
    setStep('fill');
  }, [processAddress]);

  const handleManualContinue = useCallback(() => {
    const raw = manualInput.trim();
    if (!raw) return;
    
    if (DEBUG_MODE) console.log('⌨️ Manual input:', raw.substring(0, 30) + '...');
    
    processAddress(raw);
    setAddress('');
    setStep('fill');
  }, [manualInput, processAddress]);

  const handleReset = useCallback(() => {
    if (DEBUG_MODE) console.log('🔄 Resetting scan state');
    
    setScanned(false); setAddress(''); setManualInput('');
    setDetectedType(null); setStep('camera');
    setSelectedChain(null); setSelectedAsset(null);
    setAmount(''); prevChainRef.current = null;
  }, []);

  const handleAmountChange = useCallback((v: string) => {
    let s = v.replace(/[^0-9.]/g, '');
    if (s.split('.').length > 2) return;
    if (s.length > 1 && s.startsWith('0') && !s.startsWith('0.'))
      s = s.replace(/^0+/, '') || '0';
    setAmount(s);
  }, []);

  const handleMax = useCallback(() => {
    if (availableBalance <= 0) return;
    const max = Math.max(0, availableBalance - networkFee);
    setAmount(max > 0 ? max.toString() : availableBalance.toString());
  }, [availableBalance, networkFee]);

  const handleContinue = useCallback(() => {
    if (!canSend) return;
    setShowInstruction(true);
  }, [canSend]);

  const handleInstructionConfirm = useCallback(() => {
    setShowInstruction(false);
    setShowConfirm(true);
  }, []);

  const handleExecute = useCallback(async () => {
    if (!selectedChain || !selectedAsset) return;
    
    if (DEBUG_MODE) {
      console.log('💸 Executing transaction:', {
        to: finalAddress.substring(0, 20) + '...',
        amount: enteredAmount,
        asset: selectedAsset.symbol,
        chain: getApiChainId(selectedChain),
      });
    }
    
    setShowConfirm(false);
    try {
      await sendMutation.mutateAsync({
        to:      finalAddress,
        amount:  enteredAmount,
        assetId: selectedAsset._id,
        chainId: getApiChainId(selectedChain),
      });
      showAlert('Success 🎉', `Sent ${amount} ${selectedAsset.symbol}`, [
        { text: 'OK', onPress: handleReset },
      ]);
    } catch (e: any) {
      if (DEBUG_MODE) console.error('❌ Send error:', e);
      showAlert('Failed', e?.response?.data?.message || e?.message || 'Transaction failed');
    }
  }, [selectedChain, selectedAsset, finalAddress, enteredAmount, amount, sendMutation, handleReset]);

  const chainImageUrl = useCallback((c: Blockchain) =>
    c.image?.small ?? c.image?.thumb ?? null, []);

  const instructionCautions = [
    { id: '1', text: 'Input the exact amount shown in the following page.' },
    { id: '2', text: 'Do NOT save or reuse this wallet address.' },
    { id: '3', text: `Only send ${selectedAsset?.symbol ?? 'the correct asset'}. Wrong asset = loss of funds.` },
  ];

  // ══════════════════════════════════════════════════════════════════════════
  // STEP: CAMERA
  // ══════════════════════════════════════════════════════════════════════════
  if (step === 'camera') {
    return (
      <View style={[s.root, { backgroundColor: colors.bg }]}>
        

        <View style={[s.optionsBar, { backgroundColor: colors.bg }]}>
          <View style={[s.manualWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="link-outline" size={16} color={colors.text2} style={{ marginRight: 6 }} />
            <TextInput
              style={[s.manualInput, { color: colors.text, flex: 1 }]}
              placeholder="Paste wallet address…"
              placeholderTextColor={colors.text3}
              value={manualInput}
              onChangeText={setManualInput}
              autoCapitalize="none"
              autoCorrect={false}
              underlineColorAndroid="transparent"
            />
            {manualInput.length > 0 && (
              <TouchableOpacity onPress={handleManualContinue} style={[s.goBtn, {
                backgroundColor: colors.primary,
              }]} activeOpacity={0.8}>
                <Text style={s.goBtnTxt}>Next →</Text>
              </TouchableOpacity>
            )}
          </View>

          <ImagePickerButton colors={colors} onDecoded={handleImageDecoded} />
        </View>

        <View style={s.dividerRow}>
          <View style={[s.dividerLine, { backgroundColor: colors.borderSoft }]} />
          <Text style={[s.dividerTxt, { color: colors.text3 }]}>or point camera at QR</Text>
          <View style={[s.dividerLine, { backgroundColor: colors.borderSoft }]} />
        </View>

        {IS_WEB ? (
          <View style={[s.webNoCamera, {
            backgroundColor: colors.card, borderColor: colors.border,
            marginHorizontal: Spacing[4],
          }]}>
            <LinearGradient colors={[colors.primary + '33', colors.primary + '11']} style={s.webNoCameraGrad}>
              <Ionicons name="scan-outline" size={48} color={colors.primary} />
              <Text style={[s.webNoCameraTitle, { color: colors.text }]}>
                Camera not available on Web
              </Text>
              <Text style={[s.webNoCameraSub, { color: colors.text2 }]}>
                Use the gallery option above to pick a QR image,{'\n'}
                or paste the address directly.
              </Text>
            </LinearGradient>
          </View>
        ) : !permission ? (
          <View style={s.centered}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[{ color: colors.text2, marginTop: 8 }]}>Checking camera…</Text>
          </View>
        ) : permission.granted ? (
          <View style={s.cameraWrap}>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: ['qr', 'pdf417', 'aztec', 'ean13', 'ean8', 'code128'],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            />
            <View style={s.frameOuter} pointerEvents="none">
              <View style={s.frame}>
                {[
                  { top: 0,    left: 0,  borderTopWidth: 3,    borderLeftWidth: 3   },
                  { top: 0,    right: 0, borderTopWidth: 3,    borderRightWidth: 3  },
                  { bottom: 0, left: 0,  borderBottomWidth: 3, borderLeftWidth: 3   },
                  { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3  },
                ].map((corner, i) => (
                  <View key={i} style={[s.corner, { borderColor: colors.primary, ...corner }]} />
                ))}
              </View>
              <Text style={s.cameraHint}>Align QR code within the frame</Text>
              <View style={s.chainHintWrap}>
                {[
                  { icon: '🔷', label: '0x… → ETH / BSC' },
                  { icon: '⚡',  label: 'T… → TRON'       },
                  { icon: '🟠', label: '1/3/bc1… → BTC'  },
                ].map(h => (
                  <View key={h.label} style={s.chainHintRow}>
                    <Text style={s.chainHintIcon}>{h.icon}</Text>
                    <Text style={s.chainHintTxt}>{h.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ) : (
          <View style={[s.permWrap, {
            backgroundColor: colors.card,
            margin: Spacing[4],
          }]}>
            <Ionicons name="camera-outline" size={48} color={colors.text3} />
            <Text style={[s.permTitle, { color: colors.text }]}>Camera Access Needed</Text>
            <Text style={[s.permSub, { color: colors.text2 }]}>
              {permission.canAskAgain
                ? 'Allow camera to scan QR codes.'
                : 'Permission denied. Enable from device Settings.'}
            </Text>
            {permission.canAskAgain && (
              <TouchableOpacity onPress={requestPermission} style={s.permBtn} activeOpacity={0.85}>
                <LinearGradient
                  colors={colors.primaryGradient as [string, string]}
                  style={s.permBtnGrad}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                >
                  <Text style={s.permBtnTxt}>Grant Permission</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STEP: FILL
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      <View style={[s.header, {
        paddingTop: insets.top + 12,
        borderBottomColor: colors.border,
        backgroundColor: colors.bg,
      }]}>
        <TouchableOpacity onPress={handleReset} style={s.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={[s.headerTitle, { color: colors.text }]}>Send Payment</Text>
          <Text style={[s.headerSub,   { color: colors.text2 }]}>Review & confirm transfer</Text>
        </View>
        <TouchableOpacity onPress={handleReset} style={s.iconBtn}>
          <Ionicons name="scan-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[s.fillScroll, { paddingBottom: insets.bottom + 120 }]}
      >
        <View style={[s.addrCard, { backgroundColor: colors.greenDim, borderColor: colors.greenBorder }]}>
          <View style={s.addrCardRow}>
            <Ionicons name="checkmark-circle" size={20} color={colors.green} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={[s.addrCardLabel, { color: colors.green }]}>Recipient Address</Text>
              <Text style={[s.addrCardValue, { color: colors.green }]}
                numberOfLines={2} ellipsizeMode="middle">
                {finalAddress}
              </Text>
            </View>
            <TouchableOpacity onPress={handleReset} style={[s.changeBtn, {
              backgroundColor: colors.greenDim,
            }]} activeOpacity={0.8}>
              <Ionicons name="scan-outline" size={13} color={colors.green} />
              <Text style={[s.changeBtnTxt, { color: colors.green }]}>Rescan</Text>
            </TouchableOpacity>
          </View>
        </View>

        <DetectedChainBadge detectedType={detectedType} colors={colors} />

        <View style={s.fieldGroup}>
          <View style={s.fieldLabelRow}>
            <Text style={[s.fieldLabel, { color: colors.text2 }]}>Network</Text>
            {detectedType && (
              <View style={[s.filteredBadge, { backgroundColor: colors.primaryDim }]}>
                <Text style={[s.filteredBadgeTxt, { color: colors.primary }]}>
                  {filteredBlockchains.length} compatible
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={() => setShowNetPicker(true)} activeOpacity={0.8}>
            <View style={[s.selectBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {selectedChain ? (
                <>
                  {chainImageUrl(selectedChain)
                    ? <Image source={{ uri: chainImageUrl(selectedChain)! }} style={s.chainLogo} />
                    : (
                      <LinearGradient
                        colors={getCoinColors(selectedChain.native_currency)} style={s.chainLogo}>
                        <Text style={s.chainLogoTxt}>{selectedChain.native_currency[0]}</Text>
                      </LinearGradient>
                    )}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[s.selectTitle, { color: colors.text }]}>{selectedChain.name}</Text>
                    <Text style={[s.selectSub,   { color: colors.text2 }]}>
                      {selectedChain.native_currency}
                    </Text>
                  </View>
                </>
              ) : (
                <View style={s.placeholderRow}>
                  <View style={[s.placeholderCircle, { backgroundColor: colors.surface }]}>
                    {loadingChains
                      ? <ActivityIndicator size="small" color={colors.primary} />
                      : <Ionicons name="layers-outline" size={18} color={colors.text3} />}
                  </View>
                  <Text style={[s.placeholderTxt, { color: colors.text3 }]}>
                    {loadingChains
                      ? 'Loading…'
                      : detectedType
                        ? `${filteredBlockchains.length} network(s) detected — tap to select`
                        : 'Select Network'}
                  </Text>
                </View>
              )}
              <Ionicons name="chevron-down" size={18} color={colors.text2} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={s.fieldGroup}>
          <Text style={[s.fieldLabel, { color: colors.text2 }]}>Asset</Text>
          <TouchableOpacity
            onPress={() => selectedChain && setShowAssetPicker(true)}
            activeOpacity={selectedChain ? 0.8 : 1}
          >
            <View style={[s.selectBox, { backgroundColor: colors.card, borderColor: colors.border },
              !selectedChain && { opacity: 0.45 }]}>
              {selectedAsset ? (
                <>
                  <LinearGradient colors={getCoinColors(selectedAsset.symbol)} style={s.chainLogo}>
                    <Text style={s.chainLogoTxt}>{selectedAsset.symbol[0]}</Text>
                  </LinearGradient>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[s.selectTitle, { color: colors.text }]}>{selectedAsset.name}</Text>
                    <Text style={[s.selectSub,   { color: colors.text2 }]}>
                      {selectedAsset.symbol} · {selectedAsset.assetType}
                    </Text>
                  </View>
                  {selectedAsset.balance && (
                    <Text style={[s.assetBal, { color: colors.green }]}>
                      {formatBal(selectedAsset.balance, selectedAsset.decimals)}
                    </Text>
                  )}
                </>
              ) : (
                <View style={s.placeholderRow}>
                  <View style={[s.placeholderCircle, { backgroundColor: colors.surface }]}>
                    {loadingAssets
                      ? <ActivityIndicator size="small" color={colors.primary} />
                      : <Ionicons name="wallet-outline" size={18} color={colors.text3} />}
                  </View>
                  <Text style={[s.placeholderTxt, { color: colors.text3 }]}>
                    {!selectedChain ? 'Select network first'
                      : loadingAssets ? 'Loading assets…' : 'Select Asset'}
                  </Text>
                </View>
              )}
              <Ionicons name="chevron-down" size={18} color={colors.text2} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={s.fieldGroup}>
          <Text style={[s.fieldLabel, { color: colors.text2 }]}>Amount</Text>
          <View style={[s.amountBox, {
            backgroundColor: amountFocused ? colors.primaryDim : colors.card,
            borderColor: hasInsufficient ? colors.red : amountFocused ? colors.primary : colors.border,
            opacity: selectedAsset ? 1 : 0.45,
          }]}>
            <View style={s.amountTopRow}>
              <View style={[s.amountInputPill, { backgroundColor: colors.surface, flex: 1 }]}>
                <TextInput
                  style={[s.amountInput, { color: colors.text }]}
                  placeholder="0.00"
                  placeholderTextColor={colors.text3}
                  keyboardType="decimal-pad"
                  value={amount}
                  onChangeText={handleAmountChange}
                  onFocus={() => setAmountFocused(true)}
                  onBlur={() => setAmountFocused(false)}
                  editable={!!selectedAsset}
                  underlineColorAndroid="transparent"
                />
              </View>
              <View style={[s.symbolPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[s.symbolTxt, { color: colors.text }]}>
                  {selectedAsset?.symbol ?? 'Asset'}
                </Text>
              </View>
              <TouchableOpacity onPress={handleMax} disabled={!selectedAsset || loadingBalance}>
                <Text style={[s.maxTxt, {
                  color: selectedAsset && !loadingBalance ? colors.primary : colors.text3,
                }]}>
                  MAX
                </Text>
              </TouchableOpacity>
            </View>

            <View style={s.amountBottomRow}>
              {loadingBalance
                ? <ActivityIndicator size="small" color={colors.primary} />
                : (
                  <Text style={[s.balHint, { color: colors.text2 }]}>
                    Avail:{' '}
                    <Text style={{ color: colors.green, fontWeight: '600' }}>
                      {formatBal(availableBalance, 4)} {selectedAsset?.symbol ?? ''}
                    </Text>
                  </Text>
                )}
              <View style={s.quickRow}>
                {QUICK_AMOUNTS.map(q => (
                  <TouchableOpacity
                    key={q}
                    onPress={() => {
                      if (!selectedAsset) return;
                      handleAmountChange((availableBalance * q).toFixed(6));
                    }}
                    style={[s.quickPill, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    disabled={!selectedAsset}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.quickTxt, { color: colors.text2 }]}>{q * 100}%</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {!!amountError && (
            <View style={s.errRow}>
              <Ionicons name="alert-circle-outline" size={13} color={colors.red} />
              <Text style={[s.errTxt, { color: colors.red }]}>{amountError}</Text>
            </View>
          )}
        </View>

        {selectedAsset && amount && !hasInsufficient && (
          <View style={[s.summaryBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {[
              { label: 'You Send',       val: `${amount} ${selectedAsset.symbol}`,                   col: colors.text },
              { label: 'Network Fee',    val: `${networkFee} ${selectedAsset.symbol}`,                col: colors.text },
              { label: 'Recipient Gets', val: `${recipientGets.toFixed(6)} ${selectedAsset.symbol}`, col: colors.primary },
            ].map(({ label, val, col }, i, arr) => (
              <View key={label} style={[s.summaryRow,
                i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderSoft }]}>
                <Text style={[s.summaryLabel, { color: colors.text2 }]}>{label}</Text>
                <Text style={[s.summaryVal,   { color: col }]}>{val}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={[s.bottomBar, { paddingBottom: insets.bottom + 12, backgroundColor: colors.bg }]}>
        <TouchableOpacity
          onPress={handleContinue}
          disabled={!canSend}
          activeOpacity={0.85}
          style={{ width: '100%' }}
        >
          <LinearGradient
            colors={colors.primaryGradient as [string, string]}
            style={[s.ctaBtn, !canSend && { opacity: 0.5 }]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          >
            {isSending
              ? <ActivityIndicator color="#fff" />
              : (
                <>
                  <Ionicons name="paper-plane-outline" size={18} color="#fff" />
                  <Text style={s.ctaTxt}>Send Payment</Text>
                </>
              )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <BottomSheet
        visible={showNetPicker}
        title={detectedType ? `Compatible Networks (${filteredBlockchains.length})` : 'Select Network'}
        onClose={() => setShowNetPicker(false)}
        colors={colors}
      >
        {detectedType && (
          <View style={[s.pickerBanner, { backgroundColor: colors.primaryDim }]}>
            <Ionicons name="information-circle-outline" size={15} color={colors.primary} />
            <Text style={[s.pickerBannerTxt, { color: colors.primary }]}>
              Showing networks compatible with scanned address
            </Text>
          </View>
        )}
        {loadingChains
          ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
          : filteredBlockchains.map(c => {
              const imgUrl = chainImageUrl(c);
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[s.pickerRow, { borderBottomColor: colors.borderSoft },
                    selectedChain?.id === c.id && { backgroundColor: colors.primaryDim }]}
                  onPress={() => { setSelectedChain(c); setShowNetPicker(false); }}
                  activeOpacity={0.7}
                >
                  {imgUrl
                    ? <Image source={{ uri: imgUrl }} style={s.pickerLogo} />
                    : (
                      <LinearGradient colors={getCoinColors(c.native_currency)} style={s.pickerLogo}>
                        <Text style={s.pickerLogoTxt}>{c.native_currency[0]}</Text>
                      </LinearGradient>
                    )}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[s.pickerName, { color: colors.text }]}>{c.name}</Text>
                    <Text style={[s.pickerSub,  { color: colors.text2 }]}>{c.native_currency}</Text>
                  </View>
                  {selectedChain?.id === c.id &&
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
      </BottomSheet>

      <BottomSheet
        visible={showAssetPicker}
        title="Select Asset"
        onClose={() => setShowAssetPicker(false)}
        colors={colors}
      >
        {loadingAssets
          ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
          : assets.length === 0
            ? <Text style={[s.emptyTxt, { color: colors.text2 }]}>No assets available</Text>
            : assets.map(a => (
              <TouchableOpacity
                key={a._id}
                style={[s.pickerRow, { borderBottomColor: colors.borderSoft },
                  selectedAsset?._id === a._id && { backgroundColor: colors.primaryDim }]}
                onPress={() => { setSelectedAsset(a); setShowAssetPicker(false); }}
                activeOpacity={0.7}
              >
                <LinearGradient colors={getCoinColors(a.symbol)} style={s.pickerLogo}>
                  <Text style={s.pickerLogoTxt}>{a.symbol[0]}</Text>
                </LinearGradient>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[s.pickerName, { color: colors.text }]}>{a.symbol}</Text>
                  <Text style={[s.pickerSub,  { color: colors.text2 }]}>{a.name}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  {a.balance &&
                    <Text style={[s.pickerBal, { color: colors.green }]}>
                      {formatBal(a.balance, a.decimals)}
                    </Text>}
                  {selectedAsset?._id === a._id &&
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                </View>
              </TouchableOpacity>
            ))}
      </BottomSheet>

      <TransferInstructionModal
        visible={showInstruction}
        onClose={() => setShowInstruction(false)}
        onConfirm={handleInstructionConfirm}
        cautions={instructionCautions}
      />
      <ConfirmModal
        visible={showConfirm} colors={colors} isSending={isSending}
        chain={selectedChain} asset={selectedAsset}
        recipient={finalAddress} amount={amount}
        onCancel={() => setShowConfirm(false)}
        onConfirm={handleExecute}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:         { flex: 1 },
  centered:     { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header:       {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing[5], paddingBottom: Spacing[3],
    borderBottomWidth: 1, gap: 12,
  },
  iconBtn:      { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle:  { fontSize: Typography.lg, fontWeight: '700' },
  headerSub:    { fontSize: Typography.xs, marginTop: 2 },

  optionsBar:   { paddingHorizontal: Spacing[4], paddingTop: Spacing[4], gap: Spacing[3] },
  manualWrap:   {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: Radius.xl, borderWidth: 1,
    paddingHorizontal: Spacing[4],
    paddingVertical: Platform.OS === 'ios' ? 14 : 8,
  },
  manualInput:  {
    fontSize: Typography.sm, padding: 0, margin: 0,
    ...(IS_WEB && { outlineWidth: 0, outlineStyle: 'none' } as any),
  },
  goBtn:        {
    paddingVertical: 6,
    paddingHorizontal: 14, borderRadius: Radius.lg, marginLeft: 8,
  },
  goBtnTxt:     { color: '#fff', fontWeight: '700', fontSize: Typography.sm },

  dividerRow:   {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: Spacing[4], marginVertical: Spacing[3], gap: 10,
  },
  dividerLine:  { flex: 1, height: 1 },
  dividerTxt:   { fontSize: Typography.xs, fontWeight: '500' },

  webNoCamera:     { borderRadius: Radius['2xl'], borderWidth: 1, overflow: 'hidden' },
  webNoCameraGrad: {
    alignItems: 'center', gap: Spacing[3],
    paddingVertical: Spacing[8], paddingHorizontal: Spacing[5],
  },
  webNoCameraTitle:{ fontSize: Typography.lg, fontWeight: '700', marginTop: 4 },
  webNoCameraSub:  { fontSize: Typography.sm, textAlign: 'center', lineHeight: 20 },

  cameraWrap:   { flex: 1, overflow: 'hidden' },
  frameOuter:   { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  frame:        { width: 240, height: 240, position: 'relative' },
  corner:       { position: 'absolute', width: 28, height: 28, borderRadius: 3 },
  cameraHint:   {
    color: '#fff', marginTop: 20, fontSize: 13,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  chainHintWrap:{ marginTop: 20, gap: 6, alignItems: 'flex-start' },
  chainHintRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  chainHintIcon:{ fontSize: 13 },
  chainHintTxt: { color: '#fff', fontSize: 11, fontWeight: '600' },

  permWrap:     { borderRadius: Radius['2xl'], alignItems: 'center', gap: Spacing[3], padding: Spacing[6] },
  permTitle:    { fontSize: Typography.lg, fontWeight: '700', marginTop: 4 },
  permSub:      { fontSize: Typography.sm, textAlign: 'center', lineHeight: 19 },
  permBtn:      { borderRadius: Radius.xl, overflow: 'hidden', marginTop: 8 },
  permBtnGrad:  { paddingVertical: 14, paddingHorizontal: 32 },
  permBtnTxt:   { color: '#fff', fontWeight: '700', fontSize: Typography.base },

  fillScroll:        { padding: Spacing[4], gap: Spacing[4] },
  addrCard:          { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing[4] },
  addrCardRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  addrCardLabel:     { fontSize: Typography.xs, fontWeight: '600', marginBottom: 4 },
  addrCardValue:     { fontSize: Typography.sm, fontWeight: '500', lineHeight: 18 },
  changeBtn:         {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 4, paddingHorizontal: 10,
    borderRadius: Radius.lg,
  },
  changeBtnTxt:      { fontSize: Typography.xs, fontWeight: '700' },
  fieldGroup:        { gap: 8 },
  fieldLabelRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fieldLabel:        { fontSize: Typography.sm, fontWeight: '600', marginLeft: 2 },
  filteredBadge:     { paddingVertical: 3, paddingHorizontal: 8, borderRadius: Radius.full },
  filteredBadgeTxt:  { fontSize: Typography.xs, fontWeight: '700' },
  selectBox:         {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing[4], paddingVertical: Spacing[4],
    borderRadius: Radius.xl, borderWidth: 1, minHeight: 68,
  },
  selectTitle:       { fontSize: Typography.base, fontWeight: '600' },
  selectSub:         { fontSize: Typography.xs, marginTop: 2 },
  chainLogo:         { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  chainLogoTxt:      { fontSize: 14, fontWeight: '700', color: '#fff' },
  placeholderRow:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  placeholderCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  placeholderTxt:    { fontSize: Typography.sm },
  assetBal:          { fontSize: Typography.xs, fontWeight: '700' },
  amountBox:         { borderRadius: Radius.xl, borderWidth: 1.5, padding: Spacing[4], gap: Spacing[3] },
  amountTopRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amountInputPill:   { borderRadius: Radius.lg, paddingVertical: 10, paddingHorizontal: 14 },
  amountInput:       {
    fontSize: 24, fontWeight: '600', padding: 0, margin: 0,
    ...(IS_WEB && { outlineWidth: 0, outlineStyle: 'none' } as any),
  },
  symbolPill:        {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: Radius.lg, borderWidth: 1,
  },
  symbolTxt:         { fontSize: Typography.sm, fontWeight: '700' },
  maxTxt:            { fontSize: Typography.sm, fontWeight: '700' },
  amountBottomRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  balHint:           { fontSize: Typography.xs },
  quickRow:          { flexDirection: 'row', gap: 6 },
  quickPill:         { paddingVertical: 4, paddingHorizontal: 10, borderRadius: Radius.full, borderWidth: 1 },
  quickTxt:          { fontSize: Typography.xs },
  errRow:            { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  errTxt:            { fontSize: Typography.xs },
  summaryBox:        { borderRadius: Radius.xl, borderWidth: 1, overflow: 'hidden' },
  summaryRow:        {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing[3], paddingHorizontal: Spacing[4],
  },
  summaryLabel:      { fontSize: Typography.sm },
  summaryVal:        { fontSize: Typography.sm, fontWeight: '700' },
  bottomBar:         {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: Spacing[5], paddingTop: Spacing[3],
  },
  ctaBtn:            {
    borderRadius: Radius['2xl'], paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  ctaTxt:            { fontSize: Typography.base, fontWeight: '700', letterSpacing: 0.5, color: '#fff' },
  pickerBanner:      {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: Spacing[4], marginBottom: 0, padding: Spacing[3], borderRadius: Radius.lg,
  },
  pickerBannerTxt:   { flex: 1, fontSize: Typography.xs, fontWeight: '500' },
  pickerRow:         {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: Spacing[4], paddingHorizontal: Spacing[5], borderBottomWidth: 1,
  },
  pickerLogo:        { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  pickerLogoTxt:     { fontSize: 14, fontWeight: '700', color: '#fff' },
  pickerName:        { fontSize: Typography.base, fontWeight: '600' },
  pickerSub:         { fontSize: Typography.xs, marginTop: 2 },
  pickerBal:         { fontSize: Typography.xs, fontWeight: '600' },
  emptyTxt:          { textAlign: 'center', padding: Spacing[6], fontSize: Typography.sm },
});