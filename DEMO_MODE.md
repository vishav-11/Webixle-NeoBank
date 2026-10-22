# Demo mode (mock data)
All API calls are served from `src/mocks/mockApi.ts` (axios adapter) - no backend needed.
- Login: any email + any password. Run: `npm install && npx expo start` (or `npm run web`).
- Switch back to the real API: set `EXPO_PUBLIC_DEMO_MODE=false` in `.env`.
- Edit demo data (balances, cards, transactions...) in `src/mocks/mockApi.ts`.
