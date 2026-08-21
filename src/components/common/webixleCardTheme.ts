/**
 * components/webixleCardTheme.ts
 * ─────────────────────────────────────────────
 * Colors below are pixel-sampled directly from the reference screenshots
 * (not eyeballed) — this is the "shishe ki tarah" exact match source.
 * Import these wherever a Webixle card face is rendered (Dashboard mini-card,
 * CardsScreen carousel, receipts, etc.) so every card stays visually identical.
 */

// ── Virtual "Signature" card — blue → violet diagonal gradient ──
// Sampled: top-left #508EF5, bottom-right #872DE4
export const WEBIXLE_SIGNATURE_GRADIENT: [string, string] = ['#508EF5', '#872DE4'];

// ── Virtual Black card — near-flat charcoal, subtle top→bottom fade ──
// Sampled: top #272729, bottom #18181A
export const WEBIXLE_BLACK_GRADIENT: [string, string] = ['#272729', '#18181A'];

// ── Physical Metal card — light steel, smooth diagonal fade ──
// Re-checked against the reference pixel-by-pixel: it is a plain 2-stop
// diagonal gradient, NOT a 3-tone "shine band". The earlier 4-stop version
// with tight locations produced a visible seam/line that isn't in the
// reference — that was a rendering artifact from this file, not a missing
// design feature. Fixed to a clean 2-stop fade like the other two cards.
// Sampled: top-left #E4E7EC, bottom-right #A9B0BA
export const WEBIXLE_METAL_GRADIENT: [string, string] = ['#E4E7EC', '#A9B0BA'];
export const WEBIXLE_METAL_GRADIENT_LOCATIONS: undefined = undefined;

// ── Text/icon colors on each face ──
export const WEBIXLE_FACE_COLORS = {
  signature: { text: '#FFFFFF', text2: 'rgba(255,255,255,0.7)', chip: '#C9A15A' },
  black: { text: '#FFFFFF', text2: 'rgba(255,255,255,0.55)', chip: '#B9A783' },
  metal: { text: '#16121F', text2: 'rgba(22,18,31,0.55)', chip: '#B9BCC4' },
};

// Gradient direction to use with expo-linear-gradient — matches the
// diagonal angle seen on every reference card (top-left → bottom-right)
export const WEBIXLE_GRADIENT_ANGLE = {
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
};