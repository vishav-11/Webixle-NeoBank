import React from 'react';
import ComingSoon from '@/components/ComingSoon';
import { FEATURES, PAGE_CONFIGS } from '@/config/features';

const P2PMain = FEATURES.p2p
  ? require('./P2PMain').default
  : null;

export default function P2PScreen() {
  if (!FEATURES.p2p || !P2PMain) {
    return <ComingSoon config={PAGE_CONFIGS.p2p} />;
  }
  return <P2PMain />;
}