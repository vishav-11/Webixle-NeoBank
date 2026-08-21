import React from 'react';
import ComingSoon from '@/components/ComingSoon';
import { FEATURES, PAGE_CONFIGS } from '@/config/features';

const BuyMain = FEATURES.buy
  ? require('./BuyMain').default
  : null;

export default function BuyScreen() {
  if (!FEATURES.buy || !BuyMain) {
    return <ComingSoon config={PAGE_CONFIGS.buy} />;
  }
  return <BuyMain />;
}