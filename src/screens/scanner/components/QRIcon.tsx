/**
 * app/(screens)/scanner/components/QRIcon.tsx
 * ✅ Memoized SVG icon
 */

import React, { memo } from "react";
import Svg, { Rect } from "react-native-svg";

interface Props {
  size?: number;
  color?: string;
}

function QRCodeIcon({ size = 120, color = "#fff" }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* Top-left corner */}
      <Rect x="8" y="8" width="30" height="30" rx="4" stroke={color} strokeWidth="5" fill="none" />
      <Rect x="16" y="16" width="14" height="14" rx="2" fill={color} />

      {/* Top-right corner */}
      <Rect x="62" y="8" width="30" height="30" rx="4" stroke={color} strokeWidth="5" fill="none" />
      <Rect x="70" y="16" width="14" height="14" rx="2" fill={color} />

      {/* Bottom-left corner */}
      <Rect x="8" y="62" width="30" height="30" rx="4" stroke={color} strokeWidth="5" fill="none" />
      <Rect x="16" y="70" width="14" height="14" rx="2" fill={color} />

      {/* Data blocks (reduced for performance) */}
      <Rect x="50" y="8" width="7" height="7" rx="1" fill={color} />
      <Rect x="62" y="50" width="7" height="7" rx="1" fill={color} />
      <Rect x="75" y="50" width="7" height="7" rx="1" fill={color} />
      <Rect x="88" y="50" width="7" height="7" rx="1" fill={color} />
      <Rect x="50" y="50" width="7" height="7" rx="1" fill={color} />
    </Svg>
  );
}

export default memo(QRCodeIcon);