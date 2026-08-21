/**
 * components/AppShell/components/SettingsPanel.tsx
 * ✅ Lazy loaded settings panel with animation
 */
import React, { memo, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useSettingsPanel } from '@/context/SettingsPanelContext';
import { useSettingsAnimation } from '@/hooks/useSettingsAnimation';
import SettingsScreen from '@/screens/Settings';

const SCREEN_WIDTH = Dimensions.get('window').width;

const SettingsPanel = memo(function SettingsPanel() {
  const { colors } = useTheme();
  const { isOpen, closeSettings } = useSettingsPanel();
  const { slideAnim, overlayAnim } = useSettingsAnimation(isOpen);
  const [hasOpened, setHasOpened] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setHasOpened(true);
    }
  }, [isOpen]);

  // ✅ Don't render until first open
  if (!isOpen && !hasOpened) {
    return null;
  }

  return (
    <>
      {/* Overlay */}
      <Animated.View
        pointerEvents={isOpen ? 'auto' : 'none'}
        style={[
          s.overlay,
          {
            backgroundColor: colors.overlay,
            opacity: overlayAnim,
          },
        ]}
      >
        <TouchableWithoutFeedback onPress={closeSettings}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
      </Animated.View>

      {/* Panel */}
      <Animated.View
        style={[
          s.panel,
          {
            backgroundColor: colors.bg,
            transform: [{ translateX: slideAnim }],
          },
        ]}
        pointerEvents={isOpen ? 'auto' : 'none'}
      >
        <SettingsScreen onClose={closeSettings} />
      </Animated.View>
    </>
  );
});

export default SettingsPanel;

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
  },
  panel: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: '85%',
    maxWidth: 380,
    zIndex: 50,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 20,
  },
});