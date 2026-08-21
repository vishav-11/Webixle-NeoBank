/**
 * CardVisual.tsx
 * The dark green credit card visual shown in the PDF designs.
 * Supports Virtual / Physical toggle and displays card details.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import type { NormalizedCard, CardType } from '@/types/cardTypes';
import type { ColorScheme } from '@/styles/theme';

interface Props {
  cards:          NormalizedCard[];
  activeType:     CardType;
  onTypeChange:   (type: CardType) => void;
  activeCard:     NormalizedCard | null;
  colors:         ColorScheme;
}

// Card chip SVG-like placeholder
const CardChip = ({ color }: { color: string }) => (
  <View style={[chipStyles.wrap, { borderColor: color }]}>
    <View style={[chipStyles.inner, { backgroundColor: color }]} />
  </View>
);

const chipStyles = StyleSheet.create({
  wrap:  { width: 36, height: 26, borderWidth: 1.5, borderRadius: 5, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  inner: { width: 24, height: 16, borderRadius: 3, opacity: 0.7 },
});

export default function CardVisual({ cards, activeType, onTypeChange, activeCard, colors }: Props) {
  const virtualCard  = cards.find(c => c.type === 'virtual')  || null;
  const physicalCard = cards.find(c => c.type === 'physical') || null;
  const displayed    = activeType === 'virtual' ? virtualCard : physicalCard;

  return (
    <View>
      {/* Virtual / Physical Toggle */}
      <View style={[toggle.wrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {(['virtual', 'physical'] as CardType[]).map(t => {
          const isActive = activeType === t;
          return (
            <TouchableOpacity
              key={t}
              style={[
                toggle.btn,
                isActive && { backgroundColor: colors.green },
              ]}
              onPress={() => onTypeChange(t)}
              activeOpacity={0.8}
            >
              <Text style={[toggle.txt, { color: isActive ? '#000' : colors.text2 }]}>
                {t === 'virtual' ? 'Virtual' : 'Physical'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Card Face */}
      <View style={[card.wrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Decorative circles */}
        <View style={[card.deco1, { borderColor: colors.green + '22' }]} />
        <View style={[card.deco2, { borderColor: colors.green + '15' }]} />

        {/* Chip */}
        <CardChip color={colors.green + 'AA'} />

        {/* Card number */}
        <Text style={[card.number, { color: colors.text }]}>
          {displayed
            ? `${displayed.card_number.slice(0, 4)}  xxxx  xxxx  ${displayed.last_four}`
            : '---- xxxx xxxx ----'}
        </Text>

        {/* Bottom row */}
        <View style={card.bottom}>
          <View>
            <Text style={[card.label, { color: colors.text2 }]}>Card holder name</Text>
            <Text style={[card.value, { color: colors.text }]}>
              {displayed ? displayed.nickname : '—'}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[card.label, { color: colors.text2 }]}>Expires</Text>
            <Text style={[card.value, { color: colors.text }]}>
              {displayed ? `${displayed.expiry_month}/${displayed.expiry_year}` : '—'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const toggle = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    marginBottom: 16,
  },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  txt: {
    fontSize: 14,
    fontWeight: '600',
  },
});

const card = StyleSheet.create({
  wrap: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 170,
    justifyContent: 'space-between',
  },
  deco1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 40,
    right: -50,
    top: -50,
  },
  deco2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 30,
    right: -20,
    bottom: -30,
  },
  number: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 2,
    marginTop: 14,
    marginBottom: 4,
  },
  bottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 8,
  },
  label: {
    fontSize: 11,
    marginBottom: 2,
  },
  value: {
    fontSize: 15,
    fontWeight: '700',
  },
});
