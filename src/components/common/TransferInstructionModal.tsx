// components/common/TransferInstructionModal.tsx
import React, { useState, useCallback } from 'react';
import {
  Modal, View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Platform, useWindowDimensions, Pressable,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { Radius, Spacing, Typography } from '@/styles/theme';

const isWeb = Platform.OS === 'web';
const WEB_MAX_W = 480;

// ─── Types ────────────────────────────────────────────────────────────────────
export interface TransferCaution {
  id:   string;
  text: string;
}

interface TransferInstructionModalProps {
  visible:   boolean;
  onClose:   () => void;
  onConfirm: () => void;
  title?:    string;
  cautions?: TransferCaution[];
}

// ─── Default Cautions ─────────────────────────────────────────────────────────
const DEFAULT_CAUTIONS: TransferCaution[] = [
  {
    id:   '1',
    text: 'Input the exact amount which displayed in the following page.',
  },
  {
    id:   '2',
    text: 'Do NOT save or reuse this wallet address.',
  },
  {
    id:   '3',
    text: 'Only accept TRC-20 USDT. Incorrect currency may result in loss of funds.',
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────
export function TransferInstructionModal({
  visible,
  onClose,
  onConfirm,
  title    = 'Transfer Instruction',
  cautions = DEFAULT_CAUTIONS,
}: TransferInstructionModalProps) {
  const { colors, isDark } = useTheme();
  const { width }          = useWindowDimensions();

  // Track which checkboxes are checked
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  // All cautions must be checked to enable button
  const allChecked = cautions.every((c) => checked[c.id]);

  const toggleCheck = useCallback((id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleConfirm = useCallback(() => {
    if (!allChecked) return;
    // Reset checkboxes after confirm
    setChecked({});
    onConfirm();
  }, [allChecked, onConfirm]);

  const handleClose = useCallback(() => {
    setChecked({});
    onClose();
  }, [onClose]);

  // ── Responsive width ────────────────────────────────────────────────────
  const modalWidth = isWeb
    ? Math.min(width * 0.9, WEB_MAX_W)
    : width * 0.88;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      {/* Overlay */}
      <Pressable
        style={styles.overlay}
        onPress={handleClose}
      >
        {/* Card — stop propagation so tap inside doesn't close */}
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.card,
            {
              width:           modalWidth,
              backgroundColor: isDark ? '#0F1117' : colors.card,
              borderColor:     colors.border,
            },
          ]}
        >
          {/* ── Header ── */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              {title}
            </Text>
            <TouchableOpacity
              onPress={handleClose}
              activeOpacity={0.7}
              style={[styles.closeBtn, { backgroundColor: colors.card }]}
            >
              <Ionicons name="close" size={18} color={colors.text2} />
            </TouchableOpacity>
          </View>

          {/* ── Divider ── */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* ── Body ── */}
          <ScrollView
            style={styles.body}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Intro text */}
            <Text style={[styles.introText, { color: colors.text }]}>
              By clicking{' '}
              <Text style={[styles.introHighlight, { color: colors.green }]}>
                "I Have Read"
              </Text>
              , You hereby acknowledge that You have read, and fully understood
              all below important cautions.
            </Text>

            {/* Section label */}
            <Text style={[styles.sectionLabel, { color: colors.text }]}>
              Important Cautions
            </Text>

            {/* Caution items */}
            {cautions.map((caution, index) => {
              const isChecked = !!checked[caution.id];
              return (
                <TouchableOpacity
                  key={caution.id}
                  activeOpacity={0.7}
                  onPress={() => toggleCheck(caution.id)}
                  style={styles.cautionRow}
                >
                  {/* Custom Checkbox */}
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor:     isChecked ? colors.green : colors.border,
                        backgroundColor: isChecked ? colors.green : 'transparent',
                      },
                    ]}
                  >
                    {isChecked && (
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    )}
                  </View>

                  {/* Caution Text */}
                  <Text
                    style={[
                      styles.cautionText,
                      { color: isChecked ? colors.text : colors.text2 },
                    ]}
                  >
                    <Text style={[styles.cautionIndex, { color: colors.text }]}>
                      {index + 1}.{' '}
                    </Text>
                    {caution.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ── Footer Button ── */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            {allChecked ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleConfirm}
                style={styles.confirmBtnWrap}
              >
                <LinearGradient
                  colors={['#22C55E', '#16A34A']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.confirmBtn}
                >
                  <Feather name="check-circle" size={16} color="#fff" />
                  <Text style={styles.confirmBtnText}>I have read</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              /* Disabled state */
              <View
                style={[
                  styles.confirmBtn,
                  styles.confirmBtnDisabled,
                  { backgroundColor: isDark ? '#1E2130' : colors.borderSoft },
                ]}
              >
                <Text
                  style={[styles.confirmBtnText, { color: colors.text2 }]}
                >
                  I have read
                </Text>
                <Text style={[styles.checkHint, { color: colors.text2 }]}>
                  ({cautions.filter((c) => checked[c.id]).length}/{cautions.length} checked)
                </Text>
              </View>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent:  'center',
    alignItems:      'center',
    padding:         Spacing[5],
  },

  card: {
    borderRadius: Radius.xl,
    borderWidth:  1,
    overflow:     'hidden',
    // Web shadow
    ...Platform.select({
      web: {
        boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
      } as any,
      default: {
        shadowColor:   '#000',
        shadowOffset:  { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius:  20,
        elevation:     20,
      },
    }),
  },

  // Header
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    padding:        Spacing[5],
    paddingBottom:  Spacing[4],
    position:       'relative',
  },
  title: {
    fontSize:   Typography.lg,
    fontWeight: '700',
    textAlign:  'center',
  },
  closeBtn: {
    position:     'absolute',
    right:        Spacing[4],
    top:          Spacing[4],
    width:        32,
    height:       32,
    borderRadius: 16,
    alignItems:   'center',
    justifyContent: 'center',
  },

  divider: {
    height: 1,
    marginHorizontal: Spacing[5],
  },

  // Body
  body: {
    paddingHorizontal: Spacing[5],
    paddingTop:        Spacing[4],
    maxHeight:         340,
  },

  introText: {
    fontSize:     Typography.sm,
    lineHeight:   22,
    marginBottom: Spacing[4],
  },
  introHighlight: {
    fontWeight: '700',
  },

  sectionLabel: {
    fontSize:     Typography.base,
    fontWeight:   '700',
    marginBottom: Spacing[3],
  },

  // Caution row
  cautionRow: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           Spacing[3],
    marginBottom:  Spacing[4],
    paddingRight:  Spacing[1],
  },
  checkbox: {
    width:          22,
    height:         22,
    borderRadius:   6,
    borderWidth:    2,
    alignItems:     'center',
    justifyContent: 'center',
    marginTop:      1,
    flexShrink:     0,
  },
  cautionText: {
    flex:       1,
    fontSize:   Typography.sm,
    lineHeight: 22,
  },
  cautionIndex: {
    fontWeight: '700',
  },

  // Footer
  footer: {
    padding:       Spacing[4],
    borderTopWidth: 1,
  },
  confirmBtnWrap: {
    borderRadius: Radius.lg,
    overflow:     'hidden',
  },
  confirmBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             Spacing[2],
    paddingVertical: 16,
    borderRadius:    Radius.lg,
  },
  confirmBtnDisabled: {
    flexDirection: 'column',
    gap:           4,
  },
  confirmBtnText: {
    fontSize:   Typography.base,
    fontWeight: '700',
    color:      '#fff',
  },
  checkHint: {
    fontSize: Typography.xs,
  },
});