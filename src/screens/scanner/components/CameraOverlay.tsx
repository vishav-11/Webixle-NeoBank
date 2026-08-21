/**
 * app/(screens)/scanner/components/CameraOverlay.tsx
 * ✅ Receives props from useQRScanner hook
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, Typography, Radius } from '@/styles/theme';
import ScannerFrame from './ScannerFrame';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const SCANNER_SIZE = SCREEN_W * 0.72;

// ✅ Dynamic camera import
let CameraView: any = null;
(async () => {
  try {
    const cam = await import('expo-camera');
    CameraView = cam.CameraView ?? cam.Camera;
  } catch (e) {
    console.warn('Camera not available:', e);
  }
})();

interface Props {
  torch: boolean;
  scanned: boolean;
  onBarCodeScanned: (data: string) => void;
  onClose: () => void;
  onUpload: () => void;
  onToggleTorch: () => void;
  onResetScan: () => void;
}

export default function CameraOverlay({
  torch,
  scanned,
  onBarCodeScanned,
  onClose,
  onUpload,
  onToggleTorch,
  onResetScan,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const GREEN = colors.green;

  const handleScan = ({ data }: { data: string }) => {
    if (!scanned) {
      onBarCodeScanned(data);
    }
  };

  if (!CameraView) {
    return (
      <View style={s.errorWrap}>
        <Text style={s.errorText}>Camera not available</Text>
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Camera */}
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleScan}
      />

      {/* Overlay */}
      <View style={s.overlay} pointerEvents="none">
        <View style={[s.topBlock, { backgroundColor: 'rgba(0,0,0,0.65)' }]} />
        <View style={s.middle}>
          <View style={[s.side, { backgroundColor: 'rgba(0,0,0,0.65)' }]} />
          <ScannerFrame size={SCANNER_SIZE} color={GREEN} />
          <View style={[s.side, { backgroundColor: 'rgba(0,0,0,0.65)' }]} />
        </View>
        <View style={[s.bottomBlock, { backgroundColor: 'rgba(0,0,0,0.65)' }]} />
      </View>

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={s.headerBtn} onPress={onClose} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Scan QR Code</Text>
        <TouchableOpacity
          style={[s.headerBtn, torch && { backgroundColor: 'rgba(255,200,0,0.4)' }]}
          onPress={onToggleTorch}
          activeOpacity={0.8}
        >
          <Ionicons name={torch ? 'flash' : 'flash-outline'} size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Hint */}
      <View style={[s.hint, { top: (SCREEN_H - SCANNER_SIZE) / 2 + SCANNER_SIZE + 16 }]}>
        <Text style={s.hintText}>Align QR code within the frame</Text>
      </View>

      {/* Bottom Controls */}
      <View style={[s.bottom, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity style={s.bottomBtn} onPress={onUpload} activeOpacity={0.8}>
          <Ionicons name="images-outline" size={20} color="#fff" />
          <Text style={s.bottomBtnText}>Gallery</Text>
        </TouchableOpacity>

        {scanned && (
          <TouchableOpacity
            style={[s.bottomBtn, { borderColor: GREEN, backgroundColor: `${GREEN}30` }]}
            onPress={onResetScan}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh-outline" size={20} color={GREEN} />
            <Text style={[s.bottomBtnText, { color: GREEN }]}>Scan Again</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject },
  topBlock: { height: (SCREEN_H - SCANNER_SIZE) / 2 - 40 },
  middle: { flexDirection: 'row' },
  side: { flex: 1 },
  bottomBlock: { flex: 1 },

  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingBottom: 12,
    zIndex: 20,
  },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: Typography.lg,
    fontWeight: '700',
  },

  hint: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  hintText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: Typography.sm,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },

  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: Spacing[4],
    paddingTop: 20,
    zIndex: 20,
  },
  bottomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  bottomBtnText: {
    color: '#fff',
    fontSize: Typography.sm,
    fontWeight: '600',
  },

  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  errorText: {
    color: '#fff',
    fontSize: Typography.base,
  },
});