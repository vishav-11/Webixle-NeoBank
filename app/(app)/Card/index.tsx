import React from 'react';
import ComingSoon from '@/components/ComingSoon';
import { FEATURES, PAGE_CONFIGS } from '@/config/features';

const CardMain = FEATURES.creditCard
  ? require('./CardMain').default
  : null;

export default function CreditCardScreen() {
  if (!FEATURES.creditCard || !CardMain) {
    return <ComingSoon config={PAGE_CONFIGS.creditCard} />;
  }
  return <CardMain />;
}