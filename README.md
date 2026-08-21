# MetaVault — React Native (Expo)

Cross-platform DeFi app: **one codebase → iOS + Android + Web**.

---

## 🚀 Quick Start

```bash
npm install
npm run web       # Browser (http://localhost:8081)
npm run ios       # iOS Simulator
npm run android   # Android Emulator
```

---

## 🏗️ Project Structure

```
metavault-rn/
├── app/                        ← Expo Router file-based routes
│   ├── _layout.tsx             ← Root: GestureHandler > SafeArea > QueryClient > Theme > Stack
│   ├── index.tsx               ← / Dashboard
│   ├── credit.tsx              ← /credit
│   ├── p2p.tsx                 ← /p2p
│   ├── earn.tsx                ← /earn
│   ├── loans.tsx               ← /loans
│   ├── swap.tsx                ← /swap
│   └── hub.tsx                 ← /hub
│
└── src/
    ├── types/index.ts          ← All TS interfaces
    ├── styles/
    │   └── theme.ts            ← Colors (dark/light), Typography, Spacing, Radius, constants
    ├── context/
    │   └── ThemeContext.tsx    ← useTheme() → { theme, colors, isDark, toggleTheme, setTheme }
    ├── store/
    │   └── uiStore.ts          ← Zustand: sidebarOpen, notifications, globalLoading
    ├── services/
    │   ├── apiClient.ts        ← Axios instance + interceptors
    │   └── index.ts            ← walletService, creditService, p2pService, earnService, loanService
    ├── hooks/
    │   ├── index.ts            ← All React Query hooks
    │   └── useResponsive.ts    ← { isWeb, isMobile, isTablet, isDesktop, showSidebar, showBottomNav }
    ├── components/
    │   ├── ui/index.tsx        ← Card, Badge, Button, Input, Skeleton, Stat, SectionHeader, EmptyState
    │   ├── layout/
    │   │   ├── AppShell.tsx    ← ★ Main layout — auto sidebar/bottom-nav based on platform+size
    │   │   ├── Sidebar.tsx     ← Web only, tablet+, with gradient background
    │   │   ├── Header.tsx      ← Top header bar
    │   │   └── BottomNav.tsx   ← Mobile bottom nav (5 tabs + Hub sheet)
    │   └── common/
    │       └── ComingSoon.tsx  ← Placeholder for unbuilt screens
    ├── screens/                ← One folder per route (pure UI, no navigation logic)
    │   ├── Dashboard/          ← ✅ Built — balance card, quick actions, hot products, assets
    │   ├── Credit/             ← Coming Soon
    │   ├── P2PTrading/         ← Coming Soon
    │   ├── Earn/               ← Coming Soon
    │   ├── CryptoLoans/        ← Coming Soon
    │   ├── Hub/                ← Coming Soon
    │   └── Swap/               ← Coming Soon
    └── utils/index.ts          ← formatCurrency, formatPercent, timeAgo, shortenAddress, ltvColor
```

---

## 📱 Responsive Layout Logic

```
AppShell (src/components/layout/AppShell.tsx)
         │
         ├─ Platform.OS === 'web' && width >= 768px
         │    → Render Sidebar (left, 240px wide)
         │    → NO BottomNav
         │
         └─ Native OR web < 768px
              → NO Sidebar
              → Render BottomNav (fixed bottom)
```

`useResponsive()` hook (src/hooks/useResponsive.ts):
```ts
const { isWeb, showSidebar, showBottomNav, isTablet, isDesktop } = useResponsive();
```

---

## 🎨 Theme System

Colors come from Vectornator gradient: `#00272D` → `#020F12`

```ts
// Access in any component:
const { colors, isDark, toggleTheme } = useTheme();

// Use colors like:
style={{ backgroundColor: colors.card, borderColor: colors.border }}
style={{ color: colors.text }}
style={{ color: colors.green }}  // #00D395
```

Key color tokens:
| Token          | Dark             | Light      | Usage              |
|----------------|------------------|------------|--------------------|
| `colors.bg`    | `#020F12`        | `#F0F2F5`  | Page background    |
| `colors.bgAlt` | `#00272D`        | `#E2EEF2`  | Gradient start     |
| `colors.surface` | `#0A1A1F`     | `#FFFFFF`  | Panels, inputs     |
| `colors.card`  | `#0D2028`        | `#F7FAFB`  | Card backgrounds   |
| `colors.border`| `#1A3540`        | `#D0E4EA`  | Borders            |
| `colors.green` | `#00D395`        | `#00A876`  | Primary accent     |
| `colors.red`   | `#FF4D6A`        | `#E0364E`  | Danger / negative  |
| `colors.text`  | `#FFFFFF`        | `#0A1A1F`  | Primary text       |
| `colors.text2` | `#7A9BA8`        | `#4A6878`  | Secondary text     |

---

## 🧩 UI Components

```tsx
import { Card, Badge, Button, Input, Skeleton, Stat, SectionHeader, EmptyState } from '@/components/ui';

// Card
<Card gradient>content</Card>
<Card onPress={fn}>clickable</Card>

// Badge
<Badge variant="green | red | orange | blue | default">Active</Badge>

// Button
<Button variant="primary | secondary | ghost | danger" size="sm | md | lg" loading icon="star" onPress={fn}>
  Label
</Button>

// Input  
<Input label="Amount" placeholder="0.00" suffix="MAX" error="Required" />

// SectionHeader
<SectionHeader title="My Assets" action="See All" onAction={fn} />
```

---

## 🔌 Adding a New Screen

1. Create `src/screens/MyFeature/index.tsx`
2. Create `app/myroute.tsx`:
   ```tsx
   import AppShell from '@/components/layout/AppShell';
   import MyFeatureScreen from '@/screens/MyFeature';
   export default function MyFeaturePage() {
     return <AppShell title="My Feature"><MyFeatureScreen /></AppShell>;
   }
   ```
3. Add to `BottomNav.tsx` → `TABS` array (if needed)
4. Add to `Sidebar.tsx` → `NAV_ITEMS` array

---

## 📦 Key Dependencies

| Package                   | Role                          |
|---------------------------|-------------------------------|
| `expo` ~51                | Build toolchain               |
| `expo-router` ~3.5        | File-based routing            |
| `expo-linear-gradient`    | Gradient backgrounds          |
| `@tanstack/react-query` v5| Server state + caching        |
| `zustand`                 | Global UI state               |
| `axios`                   | HTTP client                   |
| `@expo/vector-icons`      | Ionicons icon set             |
| `react-native-reanimated` | Animations                    |
| `react-native-web`        | Web rendering of RN components|

---

## 🌐 Bottom Nav Tabs

| Tab     | Route    | Icon          |
|---------|----------|---------------|
| Home    | /        | home          |
| Card    | /credit  | card          |
| Swap    | /swap    | repeat        |
| Wallet  | /earn    | wallet        |
| Hub     | popup    | grid (opens action sheet with Send, Credit, P2P, Earn, Loans, Hub, Swap) |

---

## 🔑 Environment

```js
// app.json → expo.extra
{
  "extra": {
    "apiBaseUrl": "https://your-api.com/api"
  }
}
```
