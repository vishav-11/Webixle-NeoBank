import React from 'react';
import ComingSoon from '@/components/ComingSoon';
import { FEATURES, PAGE_CONFIGS } from '@/config/features';

const LoanMain = FEATURES.loan
  ? require('./LoanMain').default
  : null;

export default function LoanScreen() {
  if (!FEATURES.loan || !LoanMain) {
    return <ComingSoon config={PAGE_CONFIGS.loan} />;
  }
  return <LoanMain />;
}