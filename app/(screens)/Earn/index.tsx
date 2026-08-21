import React from 'react';
import ComingSoon from '@/components/ComingSoon';
import { FEATURES, PAGE_CONFIGS } from '@/config/features';

// Real screen — jab banao tab uncomment karna
// import EarnMain from './EarnMain';

const EarnMain = FEATURES.earn
  ? require('./EarnMain').default  // safely load
  : null;

export default function EarnScreen() {
  if (!FEATURES.earn || !EarnMain) {
    return <ComingSoon config={PAGE_CONFIGS.earn} />;
  }
  return <EarnMain />;
}