// CardModule/components/FileUploadOptionsModal.tsx

import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, Typography, Radius } from '@/styles/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCamera: () => void;
  onGallery: () => void;
  title?: string;
}

export default function FileUploadOptionsModal({
  visible,
  onClose,
  onCamera,
  onGallery,
  title = "Upload Document",
}: Props) {
  const { colors } = useTheme();

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <Pressable
        style={[S.overlay, { backgroundColor: colors.overlay }]}
        onPress={onClose}
      >
        <Pressable
          style={[S.box, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[S.title, { color: colors.text }]}>{title}</Text>
          <Text style={[S.subtitle, { color: colors.text2 }]}>
            Choose how you want to upload your document
          </Text>

          <View style={S.options}>
            <TouchableOpacity
              style={[S.option, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => { onCamera(); onClose(); }}
              activeOpacity={0.8}
            >
              <View style={[S.iconBox, { backgroundColor: colors.primaryDim }]}>
                <Ionicons name="camera" size={24} color={colors.primary} />
              </View>
              <Text style={[S.optionTitle, { color: colors.text }]}>Camera</Text>
              <Text style={[S.optionDesc, { color: colors.text2 }]}>
                Take a photo with camera
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[S.option, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => { onGallery(); onClose(); }}
              activeOpacity={0.8}
            >
              <View style={[S.iconBox, { backgroundColor: colors.blueDim }]}>
                <Ionicons name="images" size={24} color={colors.blue} />
              </View>
              <Text style={[S.optionTitle, { color: colors.text }]}>Gallery</Text>
              <Text style={[S.optionDesc, { color: colors.text2 }]}>
                Choose from photo library
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[S.cancelBtn, { backgroundColor: colors.cardHover, borderColor: colors.border }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={[S.cancelText, { color: colors.text2 }]}>Cancel</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const S = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing[5],
  },
  box: {
    width: '100%',
    maxWidth: 340,
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    padding: Spacing[5],
  },
  title: {
    fontSize: Typography.lg,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing[1],
  },
  subtitle: {
    fontSize: Typography.sm,
    textAlign: 'center',
    marginBottom: Spacing[5],
    lineHeight: 20,
  },
  options: {
    gap: Spacing[3],
    marginBottom: Spacing[5],
  },
  option: {
    padding: Spacing[4],
    borderRadius: Radius.xl,
    borderWidth: 1,
    alignItems: 'center',
    gap: Spacing[2],
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: {
    fontSize: Typography.base,
    fontWeight: '700',
  },
  optionDesc: {
    fontSize: Typography.sm,
    textAlign: 'center',
  },
  cancelBtn: {
    padding: Spacing[4],
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: Typography.base,
    fontWeight: '600',
  },
});